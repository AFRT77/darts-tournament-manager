const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

const supabaseOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
};

const supabaseAdmin = env.supabase.url && env.supabase.serviceRoleKey
  ? createClient(env.supabase.url, env.supabase.serviceRoleKey, supabaseOptions)
  : null;

const supabasePublic = env.supabase.url && env.supabase.anonKey
  ? createClient(env.supabase.url, env.supabase.anonKey, supabaseOptions)
  : null;

module.exports = {
  supabaseAdmin,
  supabasePublic,
};
