const { fail } = require('../utils/apiResponse');
const { supabaseAdmin } = require('../config/supabase');

async function requireAuth(req, res, next) {
  try {
    if (!supabaseAdmin) {
      return fail(res, 'Supabase no configurado', 503);
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return fail(res, 'Token de autenticación requerido', 401);
    }

    const token = authHeader.slice(7);
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      return fail(res, 'Token inválido o expirado', 401);
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, display_name, created_at, updated_at')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError) {
      return fail(res, 'No se pudo cargar el perfil del usuario', 500);
    }

    req.auth = {
      token,
      user: data.user,
      profile: profile || {
        id: data.user.id,
        email: data.user.email,
        role: 'user',
        display_name: data.user.user_metadata?.display_name || null,
      },
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  requireAuth,
};
