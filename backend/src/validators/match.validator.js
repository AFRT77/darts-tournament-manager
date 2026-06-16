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

module.exports = {
  uuidParamSchema,
  matchParamSchema,
  recordLegSchema,
  walkoverSchema,
};
