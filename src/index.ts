import runExtension from "roamjs-components/util/runExtension";
import getChildrenLengthByParentUid from "roamjs-components/queries/getChildrenLengthByParentUid";
import format from "date-fns/format";
import addDays from "date-fns/addDays";
import getPageTitleByBlockUid from "roamjs-components/queries/getPageTitleByBlockUid";
import getParentUidByBlockUid from "roamjs-components/queries/getParentUidByBlockUid";
import updateBlock from "roamjs-components/writes/updateBlock";
import createBlock from "roamjs-components/writes/createBlock";
import getOrderByBlockUid from "roamjs-components/queries/getOrderByBlockUid";
import createButtonObserver from "roamjs-components/dom/createButtonObserver";
import getUidsFromButton from "roamjs-components/dom/getUidsFromButton";
import apiGet from "roamjs-components/util/apiGet";
import { getNodeEnv } from "roamjs-components/util/env";

export default runExtension(async (args) => {
  args.extensionAPI.settings.panel.create({
    tabTitle: "oura-ring",
    settings: [
      {
        id: "token",
        name: "Token",
        description:
          "Your Oura Ring personal access token, accessible from https://cloud.ouraring.com/personal-access-tokens.",
        action: { type: "input", placeholder: "xxxxxx" },
      },
      {
        id: "use-attributes",
        name: "Use plain text",
        description: "Toggles the usage of attributes on import.",
        action: { type: "switch" },
      },
    ],
  });

  const OURA_COMMAND = "Import Oura Ring";
  const API_DOMAIN =
    getNodeEnv() === "development"
      ? "http://localhost:3003"
      : "https://api.samepage.network";

  type DailySleepData = {
    score: number;
    contributors: {
      efficiency: number;
      deep_sleep: number;
      rem_sleep: number;
    };
  };
  type SleepData = {
    time_in_bed: number;
    bedtime_start: string;
    bedtime_end: string;
    total_sleep_duration: number;
    awake_time: number;
    latency: number;
    light_sleep_duration: number;
    lowest_heart_rate: number;
    heart_rate: {
      items: [];
    };
    average_hrv: number;
  };
  type DailyActivityData = {
    day: string;
    score: number;
    low_activity_time: number;
    high_activity_time: number;
    medium_activity_time: number;
    resting_time: number;
    steps: number;
  };
  type DailyReadinessData = {
    score: number;
  };
  type OuraEndpoint =
    | "daily_sleep"
    | "daily_activity"
    | "daily_readiness"
    | "sleep";
  type DataTypeMap = {
    daily_sleep: { data: DailySleepData[] };
    daily_activity: { data: DailyActivityData[] };
    daily_readiness: { data: DailyReadinessData[] };
    sleep: { data: SleepData[] };
  };

  const secondsToTimeString = (s: number) => {
    const hours = `${Math.floor(s / 3600)}`;
    const minutes = `${Math.floor(s / 60) % 60}`;
    const seconds = `${s % 60}`;
    return `${hours.padStart(2, "0")}:${minutes.padStart(
      2,
      "0"
    )}:${seconds.padStart(2, "0")}`;
  };

  const importOuraRing = async (blockUid: string) => {
    const parentUid = getParentUidByBlockUid(blockUid);
    const pageTitle = getPageTitleByBlockUid(blockUid);
    const dateFromPage = window.roamAlphaAPI.util.pageTitleToDate(pageTitle);
    const token = args.extensionAPI.settings.get("token");
    const useAttributes = args.extensionAPI.settings.get("use-attributes");
    if (!token) {
      window.roamAlphaAPI.updateBlock({
        block: {
          string: `Error: Could not find the required "Token" attribute configured in the oura-ring settings.`,
          uid: blockUid,
        },
      });
      return;
    }
    const dateToUse =
      dateFromPage && !isNaN(dateFromPage.valueOf())
        ? dateFromPage
        : new Date();
    const formattedStartDate = format(dateToUse, "yyyy-MM-dd");
    const formattedEndDate = format(addDays(dateToUse, 1), "yyyy-MM-dd");
    const bullets: string[] = [];
    const fetchData = <T extends OuraEndpoint>(
      dataType: T
    ): Promise<DataTypeMap[T]> => {
      const args = {
        domain: API_DOMAIN,
        path: `apps/oura`,
        data: {
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          token,
          dataType,
        },
      };
      return apiGet<DataTypeMap[T]>({ ...args });
    };
    const bullet = (text: string, variable: string | number) => {
      const attributeColon = useAttributes ? ":" : "::";
      return `${text}${attributeColon} ${variable}`;
    };

    try {
      const [dailySleepData, dailyActivityData, dailyReadinessData, sleepData] =
        await Promise.all([
          fetchData("daily_sleep"),
          fetchData("daily_activity"),
          fetchData("daily_readiness"),
          fetchData("sleep"),
        ]);

      // Daily Sleep
      const dailySleep = dailySleepData.data[0];
      if (!dailySleep) {
        bullets.push(
          `There is no Daily Sleep data available for ${formattedStartDate}`
        );
      } else {
        const deepSleep = secondsToTimeString(
          dailySleep.contributors.deep_sleep
        );
        const remSleep = secondsToTimeString(dailySleep.contributors.rem_sleep);

        bullets.push(
          bullet("Sleep Score", dailySleep.score),
          bullet(`Sleep Efficiency`, dailySleep.contributors.efficiency),
          bullet(`Deep Sleep`, deepSleep),
          bullet(`Rem Sleep`, remSleep)
        );
      }

      // Sleep
      const sleep = sleepData.data[0];
      if (!sleep) {
        bullets.push(
          `There is no Sleep data available for ${formattedStartDate}`
        );
      } else {
        const formattedStart = format(
          new Date(sleep.bedtime_start),
          "hh:mm:ss"
        );
        const formattedEnd = format(new Date(sleep.bedtime_end), "hh:mm:ss");
        const hrSum = sleep.heart_rate.items.reduce(
          (accumulator, currentValue) => {
            return accumulator + currentValue;
          },
          0
        );
        const hrCount = sleep.heart_rate.items.length;
        const hrAverage = hrSum / hrCount;
        const totalSleep = secondsToTimeString(sleep.total_sleep_duration);
        const lightSleep = secondsToTimeString(sleep.light_sleep_duration);

        bullets.push(
          bullet("Bedtime Start", formattedStart),
          bullet("Bedtime End", formattedEnd),
          bullet("Sleep Duration", secondsToTimeString(sleep.time_in_bed)),
          bullet("Total Sleep", totalSleep),
          bullet("Total Awake", secondsToTimeString(sleep.awake_time)),
          bullet("Sleep Latency", secondsToTimeString(sleep.latency)),
          bullet("Light Sleep", lightSleep),
          bullet("Resting Heart Rate", sleep.lowest_heart_rate),
          bullet("Average Heart Rate", hrAverage),
          bullet("Heart Rate Variability", sleep.average_hrv)
        );
      }

      // Activity
      const activity = dailyActivityData.data[0];
      if (!activity) {
        bullets.push(
          `There is no Daily Activity data available for ${formattedStartDate}`
        );
      } else {
        const formattedDay = format(new Date(activity.day), "hh:mm:ss");
        const low = activity.low_activity_time;
        const medium = activity.medium_activity_time;
        const high = activity.high_activity_time;
        const rest = activity.resting_time;

        bullets.push(
          bullet("Day", formattedDay),
          bullet("Activity Score", activity.score),
          bullet("Low Activity", secondsToTimeString(low * 60)),
          bullet("Medium Activity", secondsToTimeString(medium * 60)),
          bullet("High Activity", secondsToTimeString(high * 60)),
          bullet("Rest Activity", secondsToTimeString(rest * 60)),
          bullet("Steps", activity.steps)
        );
      }

      // Readiness
      const readiness = dailyReadinessData.data[0];
      if (!readiness) {
        bullets.push(
          `There is no Daily Readiness data available for ${formattedStartDate}`
        );
      } else {
        bullets.push(bullet(`Readiness Score`, readiness.score));
      }

      const base = getOrderByBlockUid(blockUid);
      return Promise.all([
        updateBlock({ uid: blockUid, text: bullets[0] }),
        ...bullets
          .slice(1)
          .map((text, order) =>
            createBlock({ node: { text }, parentUid, order: order + base })
          ),
      ]);
    } catch (e: any) {
      if (e.response?.status === 401) {
        return window.roamAlphaAPI.updateBlock({
          block: {
            string: `The token used (${token}) is not authorized to access oura ring.`,
            uid: blockUid,
          },
        });
      }
      window.roamAlphaAPI.updateBlock({
        block: {
          string: "Unexpected Error thrown. Email support@roamjs.com for help!",
          uid: blockUid,
        },
      });
    }
  };

  createButtonObserver({
    attribute: OURA_COMMAND.replace(/\s/g, "-"),
    shortcut: OURA_COMMAND,
    render: (b) =>
      (b.onclick = (e) => {
        importOuraRing(getUidsFromButton(b).blockUid);
        e.preventDefault();
        e.stopPropagation();
      }),
  });

  window.roamAlphaAPI.ui.commandPalette.addCommand({
    label: "Import Oura Ring Data",
    callback: async () => {
      const parentUid = await window.roamAlphaAPI.ui.mainWindow
        .getOpenPageOrBlockUid()
        .then(
          (uid) => uid || window.roamAlphaAPI.util.dateToPageUid(new Date())
        );
      const blockUid = await createBlock({
        parentUid,
        order: getChildrenLengthByParentUid(parentUid),
        node: { text: "" },
      });
      importOuraRing(blockUid);
    },
  });

  return {
    commands: ["Import Oura Ring Data"],
  };
});
