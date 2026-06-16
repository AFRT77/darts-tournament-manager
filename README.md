# Darts Tournament Manager

Aplicación web para gestionar torneos de dardos con arquitectura **API-first**, preparada para clientes web y móviles futuros.

## Stack

- **Backend:** Node.js + Express
- **Base de datos:** PostgreSQL (Supabase)
- **Frontend:** HTML + Bootstrap + JavaScript
- **Auth:** Supabase Auth (JWT)

## Estructura

```
backend/     API REST versionada (/api/v1)
frontend/    Cliente web estático
docs/        OpenAPI y documentación de base de datos
```

## Requisitos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com)

## Configuración

1. Clona el repositorio y entra en la carpeta del proyecto.

2. Copia las variables de entorno:

```bash
cp .env.example .env
```

3. Crea un proyecto en Supabase y completa `.env` con:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

4. Ejecuta las migraciones en el **SQL Editor** de Supabase (en orden):

```
backend/migrations/001_initial_schema.sql
backend/migrations/002_tournaments.sql
backend/migrations/003_matches.sql
```

5. Crea el primer usuario admin desde Supabase Auth (Authentication → Users → Add user) y luego actualiza su rol:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'tu-email@ejemplo.com';
```

6. Instala dependencias (solo la primera vez):

```bash
npm run install:backend
```

7. Arranca la aplicación **desde la raíz del proyecto**:

```bash
npm run dev
```

También puedes arrancarla desde `backend/` con `npm run dev`, pero desde la raíz es más cómodo.

La app quedará disponible en `http://localhost:3000`.

- Documentación API interactiva: `http://localhost:3000/docs`
- Info API: `http://localhost:3000/api`
- Guía para apps móviles: `docs/mobile-api.md`

- Login: `http://localhost:3000/login.html`
- Panel admin: `http://localhost:3000/admin/index.html`
- Jugadores (admin): `http://localhost:3000/admin/players.html`
- Torneos (admin): `http://localhost:3000/admin/tournaments.html`
- Panel usuario: `http://localhost:3000/user/index.html`

## Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/health` | Health check |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/register` | Registro (solo admin) |
| POST | `/api/v1/auth/refresh` | Renovar token |
| GET | `/api/v1/auth/me` | Perfil autenticado |
| GET | `/api/v1/players` | Listar jugadores |
| GET | `/api/v1/players/:id` | Detalle de jugador |
| POST | `/api/v1/players` | Crear jugador (admin) |
| PUT | `/api/v1/players/:id` | Actualizar jugador (admin) |
| DELETE | `/api/v1/players/:id` | Desactivar jugador (admin) |
| GET | `/api/v1/tournaments` | Listar torneos |
| POST | `/api/v1/tournaments` | Crear torneo (admin) |
| GET | `/api/v1/tournaments/:id` | Detalle de torneo |
| PUT | `/api/v1/tournaments/:id` | Actualizar torneo en borrador (admin) |
| GET | `/api/v1/tournaments/:id/players` | Jugadores inscritos |
| POST | `/api/v1/tournaments/:id/players` | Inscribir jugadores (admin) |
| DELETE | `/api/v1/tournaments/:id/players/:playerId` | Quitar jugador (admin) |
| POST | `/api/v1/tournaments/:id/start` | Iniciar torneo (admin) |
| POST | `/api/v1/tournaments/:id/finish` | Finalizar torneo (admin) |
| GET | `/api/v1/tournaments/:id/matches` | Listar enfrentamientos |
| POST | `/api/v1/tournaments/:id/generate-matches` | Generar enfrentamientos (admin) |
| GET | `/api/v1/tournaments/:id/bracket` | Ver cuadro |
| POST | `/api/v1/matches/:matchId/legs` | Registrar partida (admin) |
| PUT | `/api/v1/matches/:matchId/result` | Walkover / resultado manual (admin) |
| GET | `/api/v1/tournaments/:id/standings` | Clasificación del torneo |
| GET | `/api/v1/stats/global` | Ranking global de jugadores |
| GET | `/api/v1/stats/players/:id` | Estadísticas de un jugador |
| GET | `/api/v1/stats/tournaments/:id` | Resumen estadístico del torneo |

## Formato de respuesta

```json
{
  "success": true,
  "data": {},
  "meta": null,
  "error": null
}
```

## Frontend

El frontend se sirve desde Express en desarrollo (misma URL que la API).

Flujo de autenticación:

1. Login en `/login.html`
2. Token JWT guardado en `localStorage`
3. Redirección automática según rol (`admin` o `user`)
4. Rutas protegidas validan sesión con `GET /auth/me`

## Preparación para móvil

- API versionada en `/api/v1`
- Documentación OpenAPI en `/docs`
- Cabecera `X-API-Version: v1`
- Límite de peticiones configurable (`RATE_LIMIT_MAX`)
- CORS con múltiples orígenes separados por coma
- Guía detallada en `docs/mobile-api.md`

## Roadmap

- [x] Fase 0 — Fundamentos
- [x] Fase 1 — Autenticación y usuarios (web)
- [x] Fase 2 — Gestión de jugadores
- [x] Fase 3 — Gestión de torneos
- [x] Fase 4 — Generación de enfrentamientos
- [x] Fase 5 — Registro de resultados
- [x] Fase 6 — Clasificaciones
- [x] Fase 7 — Estadísticas
- [x] Fase 8 — Pulido y preparación móvil

## Licencia

MIT
