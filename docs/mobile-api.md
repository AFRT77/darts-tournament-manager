# Guía para apps móviles (iOS / Android)

Esta API está preparada para consumirse desde aplicaciones móviles nativas o híbridas.

## URL base

```
https://tu-servidor.com/api/v1
```

Desarrollo local:

```
http://TU_IP_LOCAL:3000/api/v1
```

> En móvil no uses `localhost`. Usa la IP de tu PC en la red WiFi.

## Autenticación

1. `POST /auth/login` con email y contraseña
2. Guarda `data.session.accessToken` y `data.session.refreshToken`
3. Envía el token en cada petición:

```
Authorization: Bearer <accessToken>
```

4. Renueva con `POST /auth/refresh` cuando expire

También puedes usar el SDK de Supabase Auth en móvil y validar tokens contra la misma API.

## Formato de respuesta

```json
{
  "success": true,
  "data": {},
  "meta": { "page": 1, "limit": 20, "total": 50, "totalPages": 3 },
  "error": null
}
```

## Paginación

Los listados aceptan:

- `page` (desde 1)
- `limit` (máximo 100)

Ejemplo: `GET /players?page=1&limit=20`

## Cabeceras útiles

- `X-API-Version: v1` — incluida en todas las respuestas
- `Authorization: Bearer ...` — obligatoria en rutas protegidas

## CORS

Configura en `.env`:

```
CORS_ORIGIN=http://localhost:3000,http://192.168.1.10:8081
```

Para apps nativas, CORS no aplica (solo navegadores).

## Límite de peticiones

300 peticiones por IP cada 15 minutos (configurable con `RATE_LIMIT_MAX`).

## Documentación interactiva

Con el servidor arrancado: `http://localhost:3000/docs`

## Flujo recomendado en la app

1. Login
2. Listar torneos activos
3. Ver clasificación: `GET /tournaments/{id}/standings`
4. Ver enfrentamientos: `GET /tournaments/{id}/matches`
5. Estadísticas del jugador: `GET /stats/players/{id}`

## Endpoints principales

| Acción | Método | Ruta |
|--------|--------|------|
| Login | POST | `/auth/login` |
| Perfil | GET | `/auth/me` |
| Torneos | GET | `/tournaments` |
| Clasificación | GET | `/tournaments/{id}/standings` |
| Enfrentamientos | GET | `/tournaments/{id}/matches` |
| Stats globales | GET | `/stats/global` |
