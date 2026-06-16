const { z } = require('zod');

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  }),
});

const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    displayName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
    role: z.enum(['admin', 'user']).optional(),
  }),
});

module.exports = {
  loginSchema,
  registerSchema,
};
