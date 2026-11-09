# dsh-plugin-index

The plugin index for [boldandigital](https://github.com/boldandigital)'s DeepSeek
Harness plugins, in the plugin market format version 1.

**Add it to the Discover tab of the DeepSeek Harness:**

1. Open **Plugins** in the left sidebar.
2. Switch on **Custom plugin indexes** under *Experimental plugins*
   (the bundle `@deepseek-ai/dsh-experimental-plugin-market-bundle`).
3. Open the **Discover** tab, add an index source, and enter:

```text
https://boldandigital.github.io/dsh-plugin-index/index.json
```

The index lists:

| Plugin | What it does |
|---|---|
| [dsh-google-drive](https://github.com/boldandigital/dsh-google-drive) | Connect Google Drive accounts in the Settings, browse their files in a tab of the right sidebar, and drag a file into the conversation. |

## How it is built

`build.mjs` reads the npm registry and rewrites `index.json`. The workflow in
`.github/workflows/publish.yml` runs it every morning and whenever a release
is published, so the index never claims a version the registry does not have.
The file is validated with
[`@deepseek-ai/dsh-plugin-market-index`](https://www.npmjs.com/package/@deepseek-ai/dsh-plugin-market-index),
the same validator the Harness uses.

## Local use

```sh
node build.mjs
npx serve .
```
