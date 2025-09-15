import {config} from 'dotenv';
import {initDb, createDbStructure} from '../../db';

const cfg = config({
    path: './test/config/ci/.env',
    quiet: true
});

console.log('PARSED CFG:', cfg.parsed);

(async function () {
    initDb();
    await createDbStructure();
})();
