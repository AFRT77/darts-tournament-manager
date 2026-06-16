const { supabaseAdmin } = require('../config/supabase');

class PlayerService {
  ensureConfigured() {
    if (!supabaseAdmin) {
      const error = new Error('Supabase no configurado');
      error.statusCode = 503;
      throw error;
    }
  }

  mapPlayer(row) {
    return {
      id: row.id,
      profileId: row.profile_id,
      name: row.name,
      nickname: row.nickname,
      rankingPoints: row.ranking_points,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async list({ page, limit, search, active }) {
    this.ensureConfigured();

    let query = supabaseAdmin
      .from('players')
      .select('*', { count: 'exact' });

    if (active === 'true') {
      query = query.eq('active', true);
    } else if (active === 'false') {
      query = query.eq('active', false);
    }

    if (search) {
      const term = search.replace(/[%_,]/g, '');
      query = query.or(`name.ilike.%${term}%,nickname.ilike.%${term}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .order('name', { ascending: true })
      .range(from, to);

    if (error) {
      const listError = new Error('No se pudieron obtener los jugadores');
      listError.statusCode = 500;
      throw listError;
    }

    return {
      items: (data || []).map((row) => this.mapPlayer(row)),
      meta: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit) || 0,
      },
    };
  }

  async getById(id) {
    this.ensureConfigured();

    const { data, error } = await supabaseAdmin
      .from('players')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      const fetchError = new Error('No se pudo obtener el jugador');
      fetchError.statusCode = 500;
      throw fetchError;
    }

    if (!data) {
      const notFoundError = new Error('Jugador no encontrado');
      notFoundError.statusCode = 404;
      throw notFoundError;
    }

    return this.mapPlayer(data);
  }

  async create({ name, nickname, rankingPoints, profileId }) {
    this.ensureConfigured();

    const { data, error } = await supabaseAdmin
      .from('players')
      .insert({
        name,
        nickname: nickname || null,
        ranking_points: rankingPoints ?? 0,
        profile_id: profileId || null,
      })
      .select('*')
      .single();

    if (error) {
      const createError = new Error(error.message || 'No se pudo crear el jugador');
      createError.statusCode = 400;
      throw createError;
    }

    return this.mapPlayer(data);
  }

  async update(id, { name, nickname, rankingPoints, active }) {
    this.ensureConfigured();

    const payload = {};
    if (name !== undefined) payload.name = name;
    if (nickname !== undefined) payload.nickname = nickname;
    if (rankingPoints !== undefined) payload.ranking_points = rankingPoints;
    if (active !== undefined) payload.active = active;

    const { data, error } = await supabaseAdmin
      .from('players')
      .update(payload)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      const updateError = new Error(error.message || 'No se pudo actualizar el jugador');
      updateError.statusCode = 400;
      throw updateError;
    }

    if (!data) {
      const notFoundError = new Error('Jugador no encontrado');
      notFoundError.statusCode = 404;
      throw notFoundError;
    }

    return this.mapPlayer(data);
  }

  async deactivate(id) {
    return this.update(id, { active: false });
  }

  async hardDelete(id) {
    this.ensureConfigured();
    await this.getById(id);

    const { error } = await supabaseAdmin
      .from('players')
      .delete()
      .eq('id', id);

    if (error) {
      const deleteError = new Error(error.message || 'No se pudo eliminar el jugador');
      deleteError.statusCode = 400;
      throw deleteError;
    }

    return { id };
  }
}

module.exports = new PlayerService();
