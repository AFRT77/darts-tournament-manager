const { supabaseAdmin, supabasePublic } = require('../config/supabase');

class AuthService {
  ensureConfigured() {
    if (!supabaseAdmin || !supabasePublic) {
      const error = new Error('Supabase no configurado');
      error.statusCode = 503;
      throw error;
    }
  }

  async login({ email, password }) {
    this.ensureConfigured();

    const { data, error } = await supabasePublic.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const authError = new Error('Credenciales inválidas');
      authError.statusCode = 401;
      throw authError;
    }

    const profile = await this.getProfileByUserId(data.user.id);

    return {
      user: data.user,
      profile,
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
      },
    };
  }

  async register({ email, password, displayName, role = 'user' }) {
    this.ensureConfigured();

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName || email.split('@')[0],
      },
    });

    if (error) {
      const registerError = new Error(error.message || 'No se pudo registrar el usuario');
      registerError.statusCode = 400;
      throw registerError;
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        display_name: displayName || email.split('@')[0],
        role,
      })
      .eq('id', data.user.id)
      .select('id, email, role, display_name, created_at, updated_at')
      .single();

    if (profileError) {
      const upsertError = new Error('Usuario creado, pero no se pudo actualizar el perfil');
      upsertError.statusCode = 500;
      throw upsertError;
    }

    return {
      user: data.user,
      profile,
    };
  }

  async refreshSession(refreshToken) {
    this.ensureConfigured();

    const { data, error } = await supabasePublic.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      const refreshError = new Error('No se pudo renovar la sesión');
      refreshError.statusCode = 401;
      throw refreshError;
    }

    const profile = await this.getProfileByUserId(data.user.id);

    return {
      user: data.user,
      profile,
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
      },
    };
  }

  async getProfileByUserId(userId) {
    this.ensureConfigured();

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, display_name, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      const profileError = new Error('No se pudo obtener el perfil');
      profileError.statusCode = 500;
      throw profileError;
    }

    return data;
  }

  async getCurrentUser(auth) {
    return {
      user: {
        id: auth.user.id,
        email: auth.user.email,
      },
      profile: auth.profile,
    };
  }
}

module.exports = new AuthService();
