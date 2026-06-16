const { z } = require('zod');

const uuidParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID inválido'),
  }),
});

const matchParamSchema = z.object({
  params: z.object({
    matchId: z.string().uuid('ID de enfrentamiento inválido'),
  }),
});

const recordLegSchema = z.object({
  params: z.object({
    matchId: z.string().uuid('ID de enfrentamiento inválido'),
  }),
  body: z.object({
    winnerId: z.string().uuid('ID de ganador inválido'),
  }),
});

const walkoverSchema = z.object({
  params: z.object({
    matchId: z.string().uuid('ID de enfrentamiento inválido'),
  }),
  body: z.object({
    winnerId: z.string().uuid('ID de ganador inválido'),
  }),
});

const updateResultSchema = z.object({
  params: z.object({
    matchId: z.string().uuid('ID de enfrentamiento inválido'),
  }),
  body: z.object({
    player1LegsWon: z.coerce.number().int().min(0).max(15),
    player2LegsWon: z.coerce.number().int().min(0).max(15),
  }),
});

module.exports = {
  uuidParamSchema,
  matchParamSchema,
  recordLegSchema,
  walkoverSchema,
  updateResultSchema,
};
