import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { env } from '../lib/env';

// A dedicated single-connection client for running migrations.
const migrationClient = postgres(env.DATABASE_URL, { max: 1 });

async function main() {
  console.log('Running migrations…');
  await migrate(drizzle(migrationClient), { migrationsFolder: './drizzle' });
  console.log('Migrations complete.');
  await migrationClient.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
