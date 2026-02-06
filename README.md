<a href="https://roamjs.com/">
    <img src="https://avatars.githubusercontent.com/u/138642184" alt="RoamJS Logo" title="RoamJS" align="right" height="60" />
</a>

# Oura Ring

**Import Oura Ring daily summaries into Roam. Pull in sleep, activity, and readiness metrics into your Daily Notes as attributes or plain text.**

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/RoamJS/oura-ring)

## Important Notice

> As of v1.1.0 (2024-02), this extension will route your personal access token through SamePage's backend while importing your Oura data.

This change is necessary to comply with Oura's security policies. If you would like to see exactly what is happening, please refer to our [open source endpoint](https://github.com/samepage-network/samepage.network/blob/main/api/apps/oura/get.ts).

We take your privacy seriously, and your personal access token is only used temporarily during the data import process. It is not stored with us nor shared with or any third parties.

## Usage

You'll first need to add your personal access token associated with your Oura Ring account to the `Token` field in your Roam Depot Settings. The extension needs this in order to access your personal data. [Click here](https://cloud.ouraring.com/personal-access-tokens), to generate your own personal access token.

To import your Oura Ring data to your daily note page, open the Command Palette and enter "Import Oura Ring". If the current page is a Daily note page, it will query the day before the page title, since you usually want to track last night's sleep. Otherwise, it will query yesterday's data by default. It will output the following text:

```
Bedtime Start:: hh:mm:ss
Bedtime End:: hh:mm:ss
Sleep Duration:: hh:mm:ss
Total Sleep:: hh:mm:ss
Total Awake:: hh:mm:ss
Light Sleep:: hh:mm:ss
Rem Sleep:: hh:mm:ss
Deep Sleep:: hh:mm:ss
Day Start:: hh:mm:ss
Day End:: hh:mm:ss
Low Activity:: hh:mm:ss
Medium Activity:: hh:mm:ss
High Activity:: hh:mm:ss
Rest Activity:: hh:mm:ss
Readiness Score:: hh:mm:ss
```

You can also import the data by creating a button by typing `{{import oura ring}}` into a page and clicking the button.

## Demo

![roamjs-oura-ring-demo](https://github.com/RoamJS/oura-ring/assets/3792666/5890073d-aac2-4bdd-a5e3-3ac320cdbf92)
