# MCP Control Plane

Sistema de gestión centralizada para publicar, versionar y administrar MCP Servers desplegados en Cloudflare Workers.

## 🏗️ Arquitectura

Este proyecto es un monorepo construido con Turborepo que incluye:

- **`mcp-manager`**: Backend principal con Hono + Durable Objects para gestionar MCPs
- **`mcp-dashboard`**: Frontend Next.js para administración visual
- **`mcp-worker-template`**: Template para generar Workers MCP

## 📦 Estructura del Proyecto

```
mcp-control-plane/
├── apps/
│   ├── mcp-manager/              # Backend principal
│   ├── mcp-dashboard/            # Frontend (Next.js)
│   └── mcp-worker-template/      # Template para Workers MCP
├── scripts/
│   ├── deploy.ts                 # Script de deploy
│   └── seed-db.ts                # Script para inicializar DB
└── turbo.json                    # Configuración Turborepo
```

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+
- npm 10+
- Cuenta de Cloudflare con Workers habilitado
- Wrangler CLI instalado globalmente: `npm install -g wrangler`

### Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cd apps/mcp-manager
wrangler secret put CF_API_TOKEN
wrangler secret put CF_ACCOUNT_ID
```

### Configuración de Cloudflare

1. **Crear base de datos D1**:
   ```bash
   wrangler d1 create mcp-registry
   ```

2. **Crear bucket R2**:
   ```bash
   wrangler r2 bucket create mcp-bundles
   ```

3. **Crear KV namespace** (opcional):
   ```bash
   wrangler kv:namespace create CACHE
   ```

4. **Actualizar `wrangler.jsonc`** con los IDs generados (en `apps/mcp-manager/wrangler.jsonc`)

5. **Ejecutar migraciones**:
   ```bash
   npm run seed
   ```

### Desarrollo

```bash
# Ejecutar todos los servicios en modo desarrollo
npm run dev

# Ejecutar solo el backend
cd apps/mcp-manager && npm run dev

# Ejecutar solo el frontend
cd apps/mcp-dashboard && npm run dev
```

### Deploy

```bash
# Deploy del backend
npm run deploy

# O manualmente
cd apps/mcp-manager && wrangler deploy
```

## 📚 API Endpoints

### MCPs

- `GET /api/mcp` - Listar MCPs (con paginación)
- `POST /api/mcp` - Crear nuevo MCP
- `GET /api/mcp/:id` - Obtener MCP por ID
- `PATCH /api/mcp/:id` - Actualizar MCP
- `DELETE /api/mcp/:id` - Eliminar MCP (soft delete)

### Versiones

- `GET /api/versions/:mcpId` - Listar versiones de un MCP
- `POST /api/versions/:mcpId` - Crear nueva versión
- `POST /api/versions/:mcpId/versions/:version/publish` - Publicar versión

### Deployments

- `GET /api/deployments` - Listar deployments
- `GET /api/deployments/:id` - Obtener deployment por ID
- `GET /api/deployments/:id/stream` - SSE stream de progreso

## 🗄️ Base de Datos

El proyecto usa Cloudflare D1 (SQLite) con el siguiente schema:

- `mcp_servers`: Registro de MCPs
- `mcp_versions`: Versiones de cada MCP
- `deployments`: Historial de deployments
- `mcp_auth_configs`: Configuración de autenticación

Ver `apps/mcp-manager/migrations/0001_initial.sql` para el schema completo.

## 🔐 Seguridad

- API Keys se hashean con SHA-256 antes de almacenar
- OAuth tokens se validan antes de usar
- CORS configurado estrictamente
- Secrets nunca se exponen en logs

## 🧪 Testing

```bash
# Ejecutar tests del backend
cd apps/mcp-manager && npm test

# Ejecutar tests con coverage
cd apps/mcp-manager && npm test -- --coverage
```

## 📋 Características Implementadas

- ✅ API REST completa con Hono
- ✅ Durable Objects con WebSocket streaming
- ✅ Dashboard Next.js con componentes UI
- ✅ Sistema de versionado completo
- ✅ Rollback automático
- ✅ Tests unitarios con Vitest
- ✅ Manejo de errores con Effect-TS
- ✅ Configuración moderna con `wrangler.jsonc`

## 📝 Licencia

MIT

