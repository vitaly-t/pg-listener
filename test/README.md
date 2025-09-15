testing
-------

To run unit tests locally, you need to do the following first:

* Make sure you have Postgres v10+ installed.
* Create a test database (with any name you like).
* Update [./config/local/.env](./config/local/.env) with the right connection details.

With all that done, you can run `npm test`.

**TIP** 💡

> To speed up local tests, comment out the database initialization
> inside [./config/local/index.ts](./config/local/index.ts). There is no need to re-create the database structure for
> every test run.