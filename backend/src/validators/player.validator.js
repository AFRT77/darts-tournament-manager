const { z } = require('zod');

const uuidParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de jugador inválido'),
  }),
});

const listPlayersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().optional(),
    active: z.enum(['true', 'false', 'all']).optional().default('all'),
  }),
});

const createPlayerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
    nickname: z.string().trim().min(1).optional().nullable(),
    rankingPoints: z.coerce.number().int().min(0).optional().default(0),
    profileId: z.string().uuid().optional().nullable(),
  }),
});

const updatePlayerSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de jugador inválido'),
  }),
  body: z.object({
    name: z.string().trim().min(2).optional(),
    nickname: z.string().trim().min(1).optional().nullable(),
    rankingPoints: z.coerce.number().int().min(0).optional(),
    active: z.boolean().optional(),
  }).refine(
    (body) => Object.keys(body).length > 0,
    { message: 'Debes enviar al menos un campo para actualizar' }
  ),
});

module.exports = {
  uuidParamSchema,
  listPlayersSchema,
  createPlayerSchema,
  updatePlayerSchema,
};
