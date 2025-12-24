#!/usr/bin/env tsx
/**
 * Script para deploy del MCP Manager Worker
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

async function deploy() {
  console.log('🚀 Deploying MCP Manager...\n');

  try {
    // Verificar que wrangler está instalado
    try {
      execSync('wrangler --version', { stdio: 'ignore' });
    } catch {
      console.error('❌ Wrangler no está instalado. Ejecuta: npm install -g wrangler');
      process.exit(1);
    }

    // Cambiar al directorio del worker
    const workerDir = join(process.cwd(), 'apps', 'mcp-manager');
    process.chdir(workerDir);

    console.log('📦 Building...');
    execSync('npm run build', { stdio: 'inherit' });

    console.log('\n🌐 Deploying to Cloudflare...');
    // wrangler ahora detecta automáticamente wrangler.jsonc
    execSync('wrangler deploy', { stdio: 'inherit' });

    console.log('\n✅ Deploy completado exitosamente!');
  } catch (error) {
    console.error('\n❌ Error durante el deploy:', error);
    process.exit(1);
  }
}

deploy();

