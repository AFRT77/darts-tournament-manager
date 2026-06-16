require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

function parseCorsOrigins(value) {
  if (!value) {
    return ['http://localhost:3000'];
  }

  return value.split(',').map((origin) => origin.trim()).filter(Boolean);
}

const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 300,
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
};

function validateEnv() {
  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0 && env.nodeEnv !== 'test') {
    console.warn(
      `[config] Variables de entorno faltantes: ${missing.join(', ')}. ` +
        'Copia .env.example a .env y configura Supabase.'
    );
  }
}

validateEnv();

module.exports = env;
