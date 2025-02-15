# Playwright Postgres Reporter

Playwright plugin which reports tests and test sessions results and various metadata to Postgresql Database. Connecting Grafana to Postgres enables viewing historical test sessions and tests pass rate overtime.

## Introducing in-progress `@experimental` test to a suite

If you tag your test with `@experimental`, this plugin will make the playwright run this test as usually, but the test status will be turned to `skipped` if the test actually `failed`. It helps to introduce new tests to a suite if the test is not very stable and sometimes produces flaky results. It makes the test running, and you can watch it's status over time in the dashboards, but it does not affect the overall test session status.

## Installation

To use this reporter, install it via npm:

```sh
npm install playwright-postgres-reporter --save-dev
```

## Usage

To integrate the postgres reporter into your Playwright test configuration, modify your `playwright.config.ts file` as follows:

```typescript
// Ensure you have @playwright/test installed
import { PlaywrightTestConfig } from '@playwright/test';  

let reporters: PlaywrightTestConfig['reporter'] = [
  ['junit', { outputFile: 'build/results.xml' }],
  ['html', { outputFolder: 'build/html-report', open: 'never' }],
  ['list']
];

// we enable postgres reporter conditionally
// based on the presence of the environment variable
const PLAYWRIGHT_SQL_REPORTER_ADDRESS_ENV_NAME = 'PLAYWRIGHT_SQL_REPORTER_ADDRESS';
if (process.env[PLAYWRIGHT_SQL_REPORTER_ADDRESS_ENV_NAME]) {
	reporters.push([
		'playwright-postgres-reporter',
		{
			connection_url: process.env[PLAYWRIGHT_SQL_REPORTER_ADDRESS_ENV_NAME],
			environment: "production",
      // some optional commonly used metadata tags
      // if this is not defined here, it will be autodetected by the plugin using git command
			commit_id: process.env['CI_COMMIT_SHORT_SHA'] || `${process.env['USER']}_${new Date().toISOString()}`,
			ci_job_id: process.env['CI_JOB_ID'] || `local_${new Date().getTime().toString()}`,
			ci_job_url: process.env['CI_JOB_URL'] || `file://${__dirname}/build/reports`,
      // you can add other metadata fields, all will be added to the test sessions data in postgres
			robouser_name: "some custom data"
		}
	]);
}

const config: PlaywrightTestConfig = {
  reporter: reporters,
  // other Playwright configurations...
};

export default config;

```

In order to run the tests in your project, set the environment variable:

```
PLAYWRIGHT_SQL_REPORTER_ADDRESS="postgresql://username:password@postgreshost:5432/postgres?schema=public"
```
This will enable the plugin.

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
