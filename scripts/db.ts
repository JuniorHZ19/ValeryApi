/**
 * Local PostgreSQL helper (development only).
 *
 *   npm run db:start    start PostgreSQL 18 on localhost:5433 (first run creates it in data/postgres)
 *   npm run db:migrate  apply pending migrations and load the initial data if the database is empty
 *   npm run db:info     list tables, columns and row counts
 *   npm run db:reset    DROP everything and recreate it from the migrations + seed (asks for --yes)
 *
 * migrate / info / reset use DATABASE_URL from .env.local, so they also work against Neon.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
import postgres from 'postgres';
import { migrate, seedIfEmpty } from '../src/lib/db/migrate';

const LOCAL = { port: 5433, user: 'valex', password: 'valex-local', database: 'valex' };
const DATA_DIR = path.join(process.cwd(), 'data', 'postgres');

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

async function start(): Promise<void> {
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: LOCAL.user,
    password: LOCAL.password,
    port: LOCAL.port,
    persistent: true,
    // Without these, initdb takes the Windows code page (WIN1252), which can't store emojis or "→".
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
  });

  if (!existsSync(path.join(DATA_DIR, 'PG_VERSION'))) {
    console.log('Creating a new PostgreSQL cluster in data/postgres ...');
    await pg.initialise();
  }
  await pg.start();
  await createUtf8Database();

  console.log(`PostgreSQL ready: postgres://${LOCAL.user}:${LOCAL.password}@localhost:${LOCAL.port}/${LOCAL.database}`);
  console.log('Press Ctrl+C to stop.');

  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  await new Promise(() => {}); // keep running
}

/**
 * Creates the local database in UTF8 (like Neon) when it doesn't exist. template0 is required to pick an
 * encoding different from the cluster's: clusters created before initdbFlags existed are WIN1252.
 */
async function createUtf8Database(): Promise<void> {
  const admin = postgres({ ...LOCAL, host: 'localhost', database: 'postgres', max: 1, onnotice: () => {} });
  try {
    const [exists] = await admin`select 1 from pg_database where datname = ${LOCAL.database}`;
    if (!exists) {
      await admin.unsafe(
        `create database ${LOCAL.database} encoding 'UTF8' template template0 lc_collate 'C' lc_ctype 'C'`,
      );
    }
  } finally {
    await admin.end();
  }
}

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set (see .env.example).');
  return postgres(url, { max: 1, onnotice: () => {} });
}

async function runMigrations(): Promise<void> {
  const sql = connect();
  try {
    const applied = await migrate(sql);
    console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Schema is up to date.');
    console.log((await seedIfEmpty(sql)) ? 'Initial data loaded.' : 'Data already present: seed skipped.');
  } finally {
    await sql.end();
  }
}

async function info(): Promise<void> {
  const sql = connect();
  try {
    const tables = await sql<{ table_name: string }[]>`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name`;
    for (const { table_name } of tables) {
      const [{ count }] = await sql<{ count: number }[]>`select count(*)::int as count from ${sql(table_name)}`;
      const columns = await sql<{ column_name: string; data_type: string; is_nullable: string }[]>`
        select column_name, data_type, is_nullable from information_schema.columns
        where table_schema = 'public' and table_name = ${table_name} order by ordinal_position`;
      console.log(`\n${table_name} (${count} filas)`);
      for (const c of columns) console.log(`  ${c.column_name.padEnd(18)} ${c.data_type}${c.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
    }
  } finally {
    await sql.end();
  }
}

async function reset(): Promise<void> {
  if (!process.argv.includes('--yes')) {
    console.error('This deletes ALL data in DATABASE_URL. Re-run with: npm run db:reset -- --yes');
    process.exit(1);
  }
  const sql = connect();
  try {
    await sql.unsafe('drop schema public cascade; create schema public;');
    console.log('Schema dropped.');
  } finally {
    await sql.end();
  }
  await runMigrations();
}

const commands: Record<string, () => Promise<void>> = { start, migrate: runMigrations, info, reset };
const command = commands[process.argv[2] ?? ''];
if (!command) {
  console.error(`Usage: tsx scripts/db.ts <${Object.keys(commands).join('|')}>`);
  process.exit(1);
}
command().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
