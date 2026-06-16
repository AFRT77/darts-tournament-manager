const { z } = require('zod');

const tournamentFormats = ['knockout', 'round_robin', 'groups_knockout'];
const gameTypes = ['501', '301', 'cricket'];
const tournamentStatuses = ['draft', 'active', 'finished'];

const settingsSchema = z.object({
  alMejorDe: z.coerce.number().int().min(1).max(15).default(3),
  knockoutAlMejorDe: z.coerce.number().int().min(1).max(15).optional(),
  groupCount: z.coerce.number().int().min(2).max(16).optional(),
  qualifiersPerGroup: z.coerce.number().int().min(1).max(8).optional(),
}).passthrough();

const uuidParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de torneo inválido'),
  }),
});

const tournamentPlayerParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de torneo inválido'),
    playerId: z.string().uuid('ID de jugador inválido'),
  }),
});

const listTournamentsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['draft', 'active', 'finished', 'all']).optional().default('all'),
    search: z.string().trim().optional(),
  }),
});

const createTournamentSchema = z.object({
  body: z.object({
    name: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres'),
    format: z.enum(tournamentFormats),
    gameType: z.enum(gameTypes),
    settings: settingsSchema.optional().default({ alMejorDe: 3 }),
    startDate: z.string().datetime().optional().nullable(),
  }),
});

const updateTournamentSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de torneo inválido'),
  }),
  body: z.object({
    name: z.string().trim().min(3).optional(),
    format: z.enum(tournamentFormats).optional(),
    gameType: z.enum(gameTypes).optional(),
    settings: settingsSchema.optional(),
    startDate: z.string().datetime().optional().nullable(),
  }).refine(
    (body) => Object.keys(body).length > 0,
    { message: 'Debes enviar al menos un campo para actualizar' }
  ),
});

const addPlayersSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de torneo inválido'),
  }),
  body: z.object({
    playerIds: z.array(z.string().uuid()).min(1, 'Debes seleccionar al menos un jugador'),
  }),
});

const knockoutQualifiersSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de torneo inválido'),
  }),
  body: z.object({
    qualifiers: z.array(z.object({
      groupNumber: z.coerce.number().int().min(1),
      playerIds: z.array(z.string().uuid()).min(1),
    })).min(1),
  }),
});

module.exports = {
  uuidParamSchema,
  tournamentPlayerParamSchema,
  listTournamentsSchema,
  createTournamentSchema,
  updateTournamentSchema,
  addPlayersSchema,
  knockoutQualifiersSchema,
  tournamentFormats,
  gameTypes,
  tournamentStatuses,
};
