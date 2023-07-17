import runExtension from "roamjs-components/util/runExtension";
import getChildrenLengthByParentUid from "roamjs-components/queries/getChildrenLengthByParentUid";
import format from "date-fns/format";
import subDays from "date-fns/subDays";
import getPageTitleByBlockUid from "roamjs-components/queries/getPageTitleByBlockUid";
import getParentUidByBlockUid from "roamjs-components/queries/getParentUidByBlockUid";
import getPageUidByPageTitle from "roamjs-components/queries/getPageUidByPageTitle";
import getFullTreeByParentUid from "roamjs-components/queries/getFullTreeByParentUid";
import updateBlock from "roamjs-components/writes/updateBlock";
import createBlock from "roamjs-components/writes/createBlock";
import getOrderByBlockUid from "roamjs-components/queries/getOrderByBlockUid";
import createButtonObserver from "roamjs-components/dom/createButtonObserver";
import getUidsFromButton from "roamjs-components/dom/getUidsFromButton";
import apiGet from "roamjs-components/util/apiGet";

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
          string: `Error: Could not find the required "Token" attribute configured in the [[roam/js/oura-ring]] page.`,
          uid: blockUid,
        },
      });
      return;
    }
    const dateToUse =
      dateFromPage && !isNaN(dateFromPage.valueOf())
        ? dateFromPage
        : new Date();
    const formattedDate = format(subDays(dateToUse, 1), "yyyy-MM-dd");
    const bullets: string[] = [];
    return Promise.all([
      apiGet<{
        sleep: [
          {
            score: number;
            efficiency: number;
            duration: number;
            bedtime_start: string;
            bedtime_end: string;
            total: number;
            awake: number;
            onset_latency: number;
            light: number;
            rem: number;
            deep: number;
            hr_lowest: number;
            hr_average: number;
            rmssd: number;
          }
        ];
      }>({
        domain: `https://api.ouraring.com/v1`,
        path: "sleep",
        anonymous: true,
        data: {
          start: formattedDate,
          end: formattedDate,
          access_token: token,
        },
      }),
      apiGet<{
        activity: [
          {
            day_start: number;
            day_end: number;
            score: number;
            low: number;
            medium: number;
            high: number;
            rest: number;
            steps: number;
          }
        ];
      }>({
        domain: `https://api.ouraring.com/v1`,
        path: "activity",
        anonymous: true,
        data: {
          start: formattedDate,
          end: formattedDate,
          access_token: token,
        },
      }),
      apiGet<{
        readiness: [
          {
            score: number;
          }
        ];
      }>({
        domain: `https://api.ouraring.com/v1`,
        path: "readiness",
        anonymous: true,
        data: {
          start: formattedDate,
          end: formattedDate,
          access_token: token,
        },
      }),
    ])
      .then(([sleepData, activityData, readinessData]) => {
        const sleep = sleepData.sleep[0];
        const attributeColon = useAttributes ? ":" : "::";
        if (!sleep) {
          bullets.push(`There is no sleep data available for ${formattedDate}`);
        } else {
          const { bedtime_start, bedtime_end } = sleep;
          const formattedStart = format(new Date(bedtime_start), "hh:mm:ss");
          const formattedEnd = format(new Date(bedtime_end), "hh:mm:ss");
          bullets.push(
            `Bedtime Start${attributeColon} ${formattedStart}`,
            `Bedtime End${attributeColon} ${formattedEnd}`,
            `Sleep Score${attributeColon} ${sleep.score}`,
            `Sleep Efficiency${attributeColon} ${sleep.efficiency}`,
            `Sleep Duration${attributeColon} ${secondsToTimeString(
              sleep.duration
            )}`,
            `Total Sleep${attributeColon} ${secondsToTimeString(sleep.total)}`,
            `Total Awake${attributeColon} ${secondsToTimeString(sleep.awake)}`,
            `Sleep Latency${attributeColon} ${secondsToTimeString(
              sleep.onset_latency
            )}`,
            `Light Sleep${attributeColon} ${secondsToTimeString(sleep.light)}`,
            `Rem Sleep${attributeColon} ${secondsToTimeString(sleep.rem)}`,
            `Deep Sleep${attributeColon} ${secondsToTimeString(sleep.deep)}`,
            `Resting Heart Rate${attributeColon} ${sleep.hr_lowest}`,
            `Average Heart Rate${attributeColon} ${sleep.hr_average}`,
            `Heart Rate Variability${attributeColon} ${sleep.rmssd}`
          );
        }

        const activity = activityData.activity[0];
        if (!activity) {
          bullets.push(
            `There is no activity data available for ${formattedDate}`
          );
        } else {
          const { day_start, day_end } = activity;
          const formattedStart = format(new Date(day_start), "hh:mm:ss");
          const formattedEnd = format(new Date(day_end), "hh:mm:ss");
          bullets.push(
            `Day Start${attributeColon} ${formattedStart}`,
            `Day End${attributeColon} ${formattedEnd}`,
            `Activity Score${attributeColon} ${activity.score}`,
            `Low Activity${attributeColon} ${secondsToTimeString(
              activity.low * 60
            )}`,
            `Medium Activity${attributeColon} ${secondsToTimeString(
              activity.medium * 60
            )}`,
            `High Activity${attributeColon} ${secondsToTimeString(
              activity.high * 60
            )}`,
            `Rest Activity${attributeColon} ${secondsToTimeString(
              activity.rest * 60
            )}`,
            `Steps${attributeColon} ${activity.steps}`
          );
        }

        const readiness = readinessData.readiness[0];
        if (!readiness) {
          bullets.push(
            `There is no activity data available for ${formattedDate}`
          );
        } else {
          bullets.push(`Readiness Score${attributeColon} ${readiness.score}`);
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
      })
      .catch((e) => {
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
            string:
              "Unexpected Error thrown. Email support@roamjs.com for help!",
            uid: blockUid,
          },
        });
      });
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
