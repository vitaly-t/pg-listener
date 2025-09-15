import {QueryFile} from 'pg-promise';
import {db} from './index';

(async function () {
    const create = new QueryFile('./create.sql', {minify: true});
    await db.none(create);
})();
