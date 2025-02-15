import path from "path";
import fs from "fs/promises";
import { Knex, knex } from "knex";
import {
    FullResult,
    Reporter,
    TestCase,
    TestResult,
} from "@playwright/test/reporter";
import { getGitCommit } from "./git_hash";

interface PostgresReporterOptions {
    connection_url: string;
    environment?: string;
    commit_id?: string;
    metadata?: Record<string, string>;
}

class PostgresReporterError extends Error {
    constructor(
        override message: string,
        public cause?: any,
    ) {
        super(message);
    }

    override toString() {
        if (this.cause) {
            return `[postgres reporter]: Error: ${this.message}, caused by: ${this.cause}`;
        } else {
            return `[postgres reporter]: Error: ${this.message}`;
        }
    }
}

class PostgresReporter implements Reporter {
    private _options: PostgresReporterOptions;
    private _dbClient: Knex;
    private _sessionID: Promise<string>;

    constructor(options: PostgresReporterOptions) {
        this._options = options;
        this._dbClient = knex(this._options.connection_url);

        this._sessionID = this.bootstrap();
    }

    private async db_migrations() {
        try {
            const migrationsDir = path.resolve(__dirname, "../migrations");
            const sqlFiles = (await fs.readdir(migrationsDir)).sort();

            for (const file of sqlFiles) {
                const filePath = path.join(migrationsDir, file);
                const sql = await fs.readFile(filePath, "utf-8");
                await this._dbClient.raw(sql);
            }
        } catch (error) {
            throw new PostgresReporterError(
                "Failed to migrate database",
                error,
            );
        }
    }

    private async bootstrap(): Promise<string> {
        // 2024-09-17 Migrations disabled as they are not safe for concurrent execution and our tests
        // run very concurrently.
        //await this.db_migrations();

        let session_insert_result: { id: string }[] = await this._dbClient(
            "test_sessions",
        )
            .insert({
                commit_id: this._options.commit_id || (await getGitCommit()),
                environment: this._options.environment,
                meta: this._options.metadata,
            })
            .returning("id");
        let first_row = session_insert_result[0];
        if (first_row) {
            let sid = first_row.id;
            await fs.writeFile(".postgres-reporter-session-id.txt", sid, {
                flag: "w",
            });
            return sid;
        } else {
            throw new PostgresReporterError("unexpected empty session id");
        }
    }

    onTestEnd(test: TestCase, result: TestResult) {
        // The overridden playwright reporter function is synchronous,
        // but our reporter needs to run async code.
        // So, we append every new async task (every new report)
        // into the chain of promises, which are all awaited
        // at the end (see onEnd override) by playwright.
        this._sessionID = this._sessionID.then((sessionId) =>
            this.report(sessionId, test, result),
        );
    }

    private async report(
        sessionId: string,
        test: TestCase,
        result: TestResult,
    ): Promise<string> {
        const test_name = test
            .titlePath()
            .splice(1)
            .join(" / ")
            .replace(/[@][a-z0-9-]+/g, "") // remove tags
            .replace(/[ ]+/g, " ") // normalize a bit: replace many adjacent spaces by one
            .trim();

        // Prepare the JSON report for this specific test result
        const testReport = {
            test_name: test_name,
            otel_trace_id:
                test.annotations.find((a) => a.type === "otel_trace_id")
                    ?.description || "",
            errors: result.errors,
            screenshots: result.attachments
                .filter((a) => a.name === "screenshot")
                .map((a) => a.path),
            video:
                result.attachments.find((a) => a.name === "video")?.path ||
                null,
        };

        try {
            await this._dbClient("test_results")
                .insert({
                    test_session_id: sessionId,
                    test_name: test_name,
                    duration: `${result.duration} milliseconds`,
                    status: result.status,
                    report: JSON.stringify(testReport),
                })
                .onConflict(["test_session_id", "test_name"])
                .merge();
        } catch (e) {
            throw new PostgresReporterError(
                `Failed to insert test result:\n test_session_id: ${sessionId}\n test: ${test_name}\n result: ${JSON.stringify(result.status)} `,
                e,
            );
        }

        if (
            result.status !== "passed" &&
            test.titlePath().find((i) => i.includes("@experimental"))
        ) {
            // make skipped the failed tests which are marked as experimental,
            // so playwright does not exit with negative exit code
            result.status = "skipped";
        }

        return sessionId;
    }

    async onEnd(_result: FullResult): Promise<void> {
        await this._sessionID;
    }
}

export default PostgresReporter;
