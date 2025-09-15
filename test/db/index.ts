import pgPromise from 'pg-promise';

export const pgp = pgPromise({
    capSQL: true
});

export const db = pgp({
    host: process.env.PG_HOST || 'localhost',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
    database: process.env.PG_DATABASE || 'postgres',
    port: process.env.PG_PORT ? parseInt(process.env.PG_PORT) : 5432,
    allowExitOnIdle: true
});
