import fs from 'fs';
import Mocha from 'mocha';

const tests = [
    'src/tests/JobService.test.ts',
    'src/tests/TaskService.test.ts',
    'src/tests/ContactService.test.ts',
    'src/tests/JobsApi.integration.ts'
];

async function run() {
    console.log('[TestRunner] Starting...');
    let passed = 0;
    let failed = 0;

    for (const testFile of tests) {
        console.log(`\n--- Running ${testFile} ---`);
        try {
            const mocha = new Mocha({ timeout: 5000 });
            mocha.addFile(testFile);

            await new Promise<void>((resolve, reject) => {
                mocha.run((failures) => {
                    if (failures > 0) failed += failures;
                    else passed++;
                    resolve();
                });
            });
        } catch (err: any) {
            console.error(`Failed to run ${testFile}: ${err.message}`);
            failed++;
        }

        Object.keys(require.cache).forEach(key => delete require.cache[key]);
    }

    console.log(`\n[TestRunner] Done. Passed files: ${passed}, Failed suites: ${failed}`);
    process.exit(failed > 0 ? 1 : 0);
}

run();
