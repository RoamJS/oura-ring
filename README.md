# Oura Ring

Import your Oura Ring daily summaries on a given day into your daily note page!

## Usage

> Warning: as of v1.1.0 (2024-02) this extension will send your personal access token to SamePage's backend in order while importing your Oura data. We do not store your personal access token.

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
