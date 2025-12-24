#!/usr/bin/env tsx
/**
 * Script para inicializar la base de datos D1 con el schema inicial
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

async function seed() {
  console.log('🌱 Seeding database...\n');

  try {
    const workerDir = join(process.cwd(), 'apps', 'mcp-manager');
    const migrationFile = join(workerDir, 'migrations', '0001_initial.sql');

    const sql = readFileSync(migrationFile, 'utf-8');

    // Ejecutar migración usando wrangler
    console.log('📝 Ejecutando migración...');
    execSync(`wrangler d1 execute mcp-registry --local --file=${migrationFile}`, {
      cwd: workerDir,
      stdio: 'inherit',
    });

    console.log('\n✅ Database seeded exitosamente!');
  } catch (error) {
    console.error('\n❌ Error durante el seed:', error);
    process.exit(1);
  }
}

seed();

