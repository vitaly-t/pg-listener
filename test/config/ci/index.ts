import {config} from 'dotenv';
import {initDb, createDbStructure} from '../../db';

config({
    path: './test/config/ci/.env',
    quiet: true
});

(async function () {
    initDb();
    await createDbStructure();
})();
