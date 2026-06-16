const { z } = require('zod');

const userParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de usuario inválido'),
  }),
});

const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().optional(),
  }),
});

const updateUserSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de usuario inválido'),
  }),
  body: z.object({
    displayName: z.string().trim().min(1).max(120).optional(),
    role: z.enum(['admin', 'user']).optional(),
  }).refine(
    (body) => Object.keys(body).length > 0,
    { message: 'Debes enviar al menos un campo para actualizar' }
  ),
});

module.exports = {
  userParamSchema,
  listUsersSchema,
  updateUserSchema,
};
