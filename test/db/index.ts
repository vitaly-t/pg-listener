import pgPromise, {QueryFile} from 'pg-promise';
import path from 'node:path';

let pgp: pgPromise.IMain;
let db: pgPromise.IDatabase<{}>;

export function initDb() {
    pgp ||= pgPromise({
        capSQL: true
    });
    db ||= pgp({
        host: process.env.PG_HOST || 'localhost',
        user: process.env.PG_USER || 'postgres',
        password: process.env.PG_PASSWORD || '',
        database: process.env.PG_DATABASE || 'postgres',
        port: process.env.PG_PORT ? parseInt(process.env.PG_PORT) : 5432,
        allowExitOnIdle: true
    });
    return {pgp, db};
}

export function createDbStructure() {
    const file = path.join(__dirname, 'create.sql');
    const create = new QueryFile(file, {minify: true});
    return db.none(create);
}
