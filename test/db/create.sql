-- Creates the database structure

DROP TRIGGER IF EXISTS insert_trigger_1 ON table_1;
DROP TRIGGER IF EXISTS insert_trigger_2 ON table_2;

CREATE TABLE IF NOT EXISTS table_1
(
    id  SERIAL PRIMARY KEY,
    msg TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS table_2
(
    id  SERIAL PRIMARY KEY,
    msg TEXT NOT NULL
);

CREATE OR REPLACE FUNCTION trigger_func_1()
    RETURNS TRIGGER
    LANGUAGE PLPGSQL
AS
$$
DECLARE
    v_txt text;
BEGIN
    v_txt := format('%s', NEW);
    PERFORM pg_notify('channel_1', v_txt);
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_func_2()
    RETURNS TRIGGER
    LANGUAGE PLPGSQL
AS
$$
DECLARE
    v_txt text;
BEGIN
    v_txt := format('%s', NEW);
    PERFORM pg_notify('channel_2', v_txt);
    RETURN NEW;
END;
$$;

CREATE TRIGGER insert_trigger_1
    AFTER INSERT
    ON table_1
    FOR EACH ROW
EXECUTE FUNCTION trigger_func_1();

CREATE TRIGGER insert_trigger_2
    AFTER INSERT
    ON table_2
    FOR EACH ROW
EXECUTE FUNCTION trigger_func_2();
