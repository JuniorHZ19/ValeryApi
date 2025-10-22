import type { Repository } from '../types';
import { PostgresRepository } from './postgres-repository';

let instance: Repository | null = null;

/** The PostgreSQL repository, created once per server instance. */
export function db(): Repository {
  if (instance) return instance;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Locally: run `npm run db:start` and use the URL from .env.example. ' +
        'On Vercel: add a Neon database to the project.',
    );
  }
  instance = new PostgresRepository(url);
  return instance;
}
