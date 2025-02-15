# Playwright Postgres Reporter

Playwright plugin which reports tests and test sessions results and data to Postgresql Database. Connecting Grafana to Postgres enables viewing historical test sessions and tests pass rate overtime.

## Installation

To use this reporter, install it via npm:

```sh
npm install playwright-postgres-reporter --save-dev
```

## Usage

To integrate the postgres reporter into your Playwright test configuration, modify your `playwright.config.ts file` as follows:

```typescript
// Ansure you have @playwright/test installed
import { PlaywrightTestConfig } from '@playwright/test';  

let reporters: PlaywrightTestConfig['reporter'] = [
  ['junit', { outputFile: 'build/results.xml' }],
  ['html', { outputFolder: 'build/html-report', open: 'never' }],
  ['list']
];

// Add the console reporter
reporters.push(['playwright-postgress-reporter', {}]);

const config: PlaywrightTestConfig = {
  reporter: reporters,
  // other Playwright configurations...
};

export default config;

```

## For developers of this plugin

How to build?

```
pnpm install
pnpm build
```

How to release to npm?

1. Update `package.json` version field
2. Run build
3. Run `pnpm release`
4. Add git tag (update version) `git tag -a v1.0.0 -m "Release 1.0.0"`
5. Then push the tag to the remote repository
