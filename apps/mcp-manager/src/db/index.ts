import { drizzle } from 'drizzle-orm/d1';
import type { D1Database } from '@cloudflare/workers-types';
import * as schema from './schema';

export const createDb = (db: D1Database) => drizzle(db, { schema });
export type DbClient = ReturnType<typeof createDb>;
