# Esquema de base de datos

## Fase 0

### `profiles`

Extiende `auth.users` de Supabase.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | Mismo ID que `auth.users` |
| email | TEXT | Email del usuario |
| role | TEXT | `admin` o `user` |
| display_name | TEXT | Nombre visible |
| created_at | TIMESTAMPTZ | Fecha de creación |
| updated_at | TIMESTAMPTZ | Fecha de actualización |

### `players`

Jugadores registrados en el sistema.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | Identificador del jugador |
| profile_id | UUID FK | Usuario vinculado (opcional) |
| name | TEXT | Nombre completo |
| nickname | TEXT | Apodo |
| ranking_points | INTEGER | Puntos de ranking |
| active | BOOLEAN | Jugador activo |
| created_at | TIMESTAMPTZ | Fecha de creación |
| updated_at | TIMESTAMPTZ | Fecha de actualización |

## Próximas fases

- `matches`
- `match_legs`
- `standings`

## Fase 3

### `tournaments`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | Identificador del torneo |
| name | TEXT | Nombre del torneo |
| format | TEXT | `knockout`, `round_robin`, `groups_knockout` |
| game_type | TEXT | `501`, `301`, `cricket` |
| status | TEXT | `draft`, `active`, `finished` |
| settings | JSONB | Configuración (`bestOf`, `groupCount`, etc.) |
| start_date | TIMESTAMPTZ | Fecha de inicio |
| end_date | TIMESTAMPTZ | Fecha de fin |

### `tournament_players`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | Identificador de inscripción |
| tournament_id | UUID FK | Torneo |
| player_id | UUID FK | Jugador |
| seed | INTEGER | Orden de cabeza de serie |
| group_number | INTEGER | Grupo (fase de grupos) |
