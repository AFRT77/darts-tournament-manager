const { supabaseAdmin } = require('../config/supabase');

class UsersService {
  ensureConfigured() {
    if (!supabaseAdmin) {
      const error = new Error('Supabase no configurado');
      error.statusCode = 503;
      throw error;
    }
  }

  mapProfile(row) {
    return {
      id: row.id,
      email: row.email,
      role: row.role,
      displayName: row.display_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async list({ page, limit, search }) {
    this.ensureConfigured();

    let query = supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' });

    if (search) {
      const term = search.replace(/[%_,]/g, '');
      query = query.or(`email.ilike.%${term}%,display_name.ilike.%${term}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      const listError = new Error('No se pudieron obtener los usuarios');
      listError.statusCode = 500;
      throw listError;
    }

    return {
      items: (data || []).map((row) => this.mapProfile(row)),
      meta: {
        page,
        limit,
        total: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0,
      },
    };
  }

  async getById(id) {
    this.ensureConfigured();

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      const fetchError = new Error('No se pudo obtener el usuario');
      fetchError.statusCode = 500;
      throw fetchError;
    }

    if (!data) {
      const notFoundError = new Error('Usuario no encontrado');
      notFoundError.statusCode = 404;
      throw notFoundError;
    }

    return this.mapProfile(data);
  }

  async update(id, { role, displayName }) {
    this.ensureConfigured();
    await this.getById(id);

    const payload = {};
    if (role !== undefined) payload.role = role;
    if (displayName !== undefined) payload.display_name = displayName;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      const updateError = new Error(error.message || 'No se pudo actualizar el usuario');
      updateError.statusCode = 400;
      throw updateError;
    }

    return this.mapProfile(data);
  }

  async delete(id, currentUserId) {
    this.ensureConfigured();

    if (id === currentUserId) {
      const selfError = new Error('No puedes eliminar tu propio usuario');
      selfError.statusCode = 409;
      throw selfError;
    }

    await this.getById(id);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (error) {
      const deleteError = new Error(error.message || 'No se pudo eliminar el usuario');
      deleteError.statusCode = 400;
      throw deleteError;
    }

    return { id };
  }
}

module.exports = new UsersService();
