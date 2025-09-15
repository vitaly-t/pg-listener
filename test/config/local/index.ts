import {config} from 'dotenv';
import {initDb, createDbStructure} from '../../db';

config({
    path: './test/config/local/.env',
    quiet: true
});

/**
 * To speed up local unit tests, comment this one out after the initial run,
 * there is no need re-creating the database structure for every test run.
 */
(async function () {
    initDb();
    await createDbStructure();
})();
