#!/bin/sh
# db/init/01-roles.sh — first-start roles for the SmartBiz database (U1 u1-skeleton;
# NFR2.1–NFR2.3, infrastructure-specification.md).
#
# The postgres image runs this once, on an empty data directory, from
# /docker-entrypoint-initdb.d (the live compose service and every throwaway gate container
# mount db/init there read-only). It creates:
#   - the database `smartbiz`;
#   - `app_role`, a NOLOGIN group role that the migrations grant exact privileges to (C9);
#   - `smartbiz_app`, the LOGIN the server connects as: a member of app_role, not a superuser.
# The app password comes from SMARTBIZ_APP_PASSWORD in the container's environment and is
# passed to psql as a variable, so it never appears in this file or in shell history.
# Every statement is guarded, so the script is safe if a role or the database already exists.

if [ -z "${SMARTBIZ_APP_PASSWORD:-}" ]; then
  echo "01-roles.sh: SMARTBIZ_APP_PASSWORD is not set" >&2
  exit 1
fi

psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER:-postgres}" --dbname postgres \
  -v app_password="$SMARTBIZ_APP_PASSWORD" <<'EOSQL'
SELECT 'CREATE DATABASE smartbiz'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'smartbiz')\gexec

SELECT 'CREATE ROLE app_role NOLOGIN'
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_role')\gexec

SELECT format('CREATE ROLE smartbiz_app LOGIN NOSUPERUSER PASSWORD %L IN ROLE app_role', :'app_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'smartbiz_app')\gexec
EOSQL
