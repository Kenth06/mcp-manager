#!/usr/bin/env tsx
/**
 * Script para inicializar la base de datos D1 con el schema inicial
 */

import { execSync } from 'child_process';
import { readdirSync } from 'fs';
import { join } from 'path';

async function seed() {
  console.log(' Seeding database...\n');

  try {
    const workerDir = join(process.cwd(), 'apps', 'mcp-manager');
    const migrationsDir = join(workerDir, 'migrations');
    const migrationFiles = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log(' No migration files found.');
      return;
    }

    for (const file of migrationFiles) {
      const migrationFile = join(migrationsDir, file);

      console.log(`📝 Ejecutando migración ${file}...`);
      execSync(`wrangler d1 execute mcp-registry --local --file=${migrationFile}`, {
        cwd: workerDir,
        stdio: 'inherit',
      });
    }

    console.log('\n Database seeded exitosamente!');
  } catch (error) {
    console.error('\n Error durante el seed:', error);
    process.exit(1);
  }
}

seed();
