import os

import psycopg
from psycopg import sql

database_name = os.environ["POSTGRES_DB"]

with psycopg.connect(
    dbname="postgres",
    user=os.environ["POSTGRES_USER"],
    password=os.environ["POSTGRES_PASSWORD"],
    host=os.environ["POSTGRES_HOST"],
    port=os.environ["POSTGRES_PORT"],
    autocommit=True,
) as connection:
    connection.execute(
        "SELECT pg_advisory_lock(hashtext(%s))",
        ("ocr-a:ensure-database",),
    )
    exists = connection.execute(
        "SELECT 1 FROM pg_database WHERE datname = %s",
        (database_name,),
    ).fetchone()
    if not exists:
        connection.execute(
            sql.SQL("CREATE DATABASE {}").format(
                sql.Identifier(database_name)
            )
        )

print(f"Database ready: {database_name}")
