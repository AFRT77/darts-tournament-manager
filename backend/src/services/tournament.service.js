const { supabaseAdmin } = require('../config/supabase');
const { normalizeSettings } = require('../utils/tournamentSettings');

class TournamentService {
  ensureConfigured() {
    if (!supabaseAdmin) {
      const error = new Error('Supabase no configurado');
      error.statusCode = 503;
      throw error;
    }
  }

  mapTournament(row, extra = {}) {
    return {
      id: row.id,
      name: row.name,
      format: row.format,
      gameType: row.game_type,
      status: row.status,
      settings: normalizeSettings(row.settings || {}),
      startDate: row.start_date,
      endDate: row.end_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      playerCount: extra.playerCount ?? 0,
    };
  }

  mapTournamentPlayer(row) {
    const player = row.players || row.player || null;

    return {
      id: row.id,
      tournamentId: row.tournament_id,
      playerId: row.player_id,
      seed: row.seed,
      groupNumber: row.group_number,
      player: player ? {
        id: player.id,
        name: player.name,
        nickname: player.nickname,
        rankingPoints: player.ranking_points,
        active: player.active,
      } : null,
    };
  }

  async getById(id) {
    this.ensureConfigured();

    const { data, error } = await supabaseAdmin
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      const fetchError = new Error('No se pudo obtener el torneo');
      fetchError.statusCode = 500;
      throw fetchError;
    }

    if (!data) {
      const notFoundError = new Error('Torneo no encontrado');
      notFoundError.statusCode = 404;
      throw notFoundError;
    }

    const playerCount = await this.countPlayers(id);
    return this.mapTournament(data, { playerCount });
  }

  async countPlayers(tournamentId) {
    const { count, error } = await supabaseAdmin
      .from('tournament_players')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId);

    if (error) {
      return 0;
    }

    return count || 0;
  }

  async list({ page, limit, status, search }) {
    this.ensureConfigured();

    let query = supabaseAdmin
      .from('tournaments')
      .select('*', { count: 'exact' });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      const term = search.replace(/[%_,]/g, '');
      query = query.ilike('name', `%${term}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      const listError = new Error('No se pudieron obtener los torneos');
      listError.statusCode = 500;
      throw listError;
    }

    const tournaments = await Promise.all(
      (data || []).map(async (row) => {
        const playerCount = await this.countPlayers(row.id);
        return this.mapTournament(row, { playerCount });
      })
    );

    return {
      items: tournaments,
      meta: {
        page,
        limit,
        total: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0,
      },
    };
  }

  async create({ name, format, gameType, settings, startDate }) {
    this.ensureConfigured();

    const { data, error } = await supabaseAdmin
      .from('tournaments')
      .insert({
        name,
        format,
        game_type: gameType,
        status: 'draft',
        settings: normalizeSettings(settings || { alMejorDe: 3 }),
        start_date: startDate || null,
      })
      .select('*')
      .single();

    if (error) {
      const createError = new Error(error.message || 'No se pudo crear el torneo');
      createError.statusCode = 400;
      throw createError;
    }

    return this.mapTournament(data, { playerCount: 0 });
  }

  async update(id, { name, format, gameType, settings, startDate }) {
    const tournament = await this.getById(id);

    if (tournament.status !== 'draft') {
      const statusError = new Error('Solo se pueden editar torneos en borrador');
      statusError.statusCode = 409;
      throw statusError;
    }

    const payload = {};
    if (name !== undefined) payload.name = name;
    if (format !== undefined) payload.format = format;
    if (gameType !== undefined) payload.game_type = gameType;
    if (settings !== undefined) payload.settings = normalizeSettings(settings);
    if (startDate !== undefined) payload.start_date = startDate;

    const { data, error } = await supabaseAdmin
      .from('tournaments')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      const updateError = new Error(error.message || 'No se pudo actualizar el torneo');
      updateError.statusCode = 400;
      throw updateError;
    }

    const playerCount = await this.countPlayers(id);
    return this.mapTournament(data, { playerCount });
  }

  async listPlayers(tournamentId) {
    await this.getById(tournamentId);

    const { data, error } = await supabaseAdmin
      .from('tournament_players')
      .select(`
        id,
        tournament_id,
        player_id,
        seed,
        group_number,
        players:player_id (
          id,
          name,
          nickname,
          ranking_points,
          active
        )
      `)
      .eq('tournament_id', tournamentId)
      .order('seed', { ascending: true, nullsFirst: false });

    if (error) {
      const listError = new Error('No se pudieron obtener los jugadores inscritos');
      listError.statusCode = 500;
      throw listError;
    }

    return (data || []).map((row) => this.mapTournamentPlayer(row));
  }

  async addPlayers(tournamentId, playerIds) {
    const tournament = await this.getById(tournamentId);

    if (tournament.status !== 'draft') {
      const statusError = new Error('Solo se pueden inscribir jugadores en torneos en borrador');
      statusError.statusCode = 409;
      throw statusError;
    }

    const uniqueIds = [...new Set(playerIds)];

    const { data: players, error: playersError } = await supabaseAdmin
      .from('players')
      .select('id, active')
      .in('id', uniqueIds);

    if (playersError) {
      const fetchError = new Error('No se pudieron validar los jugadores');
      fetchError.statusCode = 500;
      throw fetchError;
    }

    if ((players || []).length !== uniqueIds.length) {
      const missingError = new Error('Uno o más jugadores no existen');
      missingError.statusCode = 404;
      throw missingError;
    }

    const inactive = (players || []).filter((player) => !player.active);
    if (inactive.length > 0) {
      const inactiveError = new Error('No se pueden inscribir jugadores inactivos');
      inactiveError.statusCode = 409;
      throw inactiveError;
    }

    const currentCount = await this.countPlayers(tournamentId);
    const rows = uniqueIds.map((playerId, index) => ({
      tournament_id: tournamentId,
      player_id: playerId,
      seed: currentCount + index + 1,
    }));

    const { error } = await supabaseAdmin
      .from('tournament_players')
      .upsert(rows, { onConflict: 'tournament_id,player_id', ignoreDuplicates: true });

    if (error) {
      const insertError = new Error(error.message || 'No se pudieron inscribir los jugadores');
      insertError.statusCode = 400;
      throw insertError;
    }

    return this.listPlayers(tournamentId);
  }

  async removePlayer(tournamentId, playerId) {
    const tournament = await this.getById(tournamentId);

    if (tournament.status !== 'draft') {
      const statusError = new Error('Solo se pueden quitar jugadores en torneos en borrador');
      statusError.statusCode = 409;
      throw statusError;
    }

    const { error } = await supabaseAdmin
      .from('tournament_players')
      .delete()
      .eq('tournament_id', tournamentId)
      .eq('player_id', playerId);

    if (error) {
      const deleteError = new Error('No se pudo quitar al jugador del torneo');
      deleteError.statusCode = 500;
      throw deleteError;
    }

    return this.listPlayers(tournamentId);
  }

  async start(tournamentId) {
    const tournament = await this.getById(tournamentId);

    if (tournament.status !== 'draft') {
      const statusError = new Error('Solo se pueden iniciar torneos en borrador');
      statusError.statusCode = 409;
      throw statusError;
    }

    if (tournament.playerCount < 2) {
      const playersError = new Error('Se necesitan al menos 2 jugadores inscritos');
      playersError.statusCode = 409;
      throw playersError;
    }

    const { data, error } = await supabaseAdmin
      .from('tournaments')
      .update({
        status: 'active',
        start_date: tournament.startDate || new Date().toISOString(),
      })
      .eq('id', tournamentId)
      .select('*')
      .single();

    if (error) {
      const startError = new Error('No se pudo iniciar el torneo');
      startError.statusCode = 500;
      throw startError;
    }

    return this.mapTournament(data, { playerCount: tournament.playerCount });
  }

  async finish(tournamentId) {
    const tournament = await this.getById(tournamentId);

    if (tournament.status !== 'active') {
      const statusError = new Error('Solo se pueden finalizar torneos activos');
      statusError.statusCode = 409;
      throw statusError;
    }

    const { data, error } = await supabaseAdmin
      .from('tournaments')
      .update({
        status: 'finished',
        end_date: new Date().toISOString(),
      })
      .eq('id', tournamentId)
      .select('*')
      .single();

    if (error) {
      const finishError = new Error('No se pudo finalizar el torneo');
      finishError.statusCode = 500;
      throw finishError;
    }

    return this.mapTournament(data, { playerCount: tournament.playerCount });
  }

  async delete(id) {
    this.ensureConfigured();
    await this.getById(id);

    const { error } = await supabaseAdmin
      .from('tournaments')
      .delete()
      .eq('id', id);

    if (error) {
      const deleteError = new Error(error.message || 'No se pudo eliminar el torneo');
      deleteError.statusCode = 400;
      throw deleteError;
    }

    return { id };
  }

  async getKnockoutQualifiers(tournamentId) {
    const tournament = await this.getById(tournamentId);
    return {
      qualifiers: tournament.settings?.knockoutQualifiers || null,
      qualifiersPerGroup: tournament.settings?.qualifiersPerGroup || 2,
    };
  }

  async setKnockoutQualifiers(tournamentId, qualifiers) {
    const tournament = await this.getById(tournamentId);

    if (tournament.format !== 'groups_knockout') {
      const formatError = new Error('Solo aplica a torneos de grupos + eliminatoria');
      formatError.statusCode = 409;
      throw formatError;
    }

    const settings = {
      ...tournament.settings,
      knockoutQualifiers: qualifiers,
    };

    const { data, error } = await supabaseAdmin
      .from('tournaments')
      .update({ settings })
      .eq('id', tournamentId)
      .select('*')
      .single();

    if (error) {
      const saveError = new Error('No se pudieron guardar los clasificados');
      saveError.statusCode = 500;
      throw saveError;
    }

    return {
      qualifiers,
      tournament: this.mapTournament(data, { playerCount: tournament.playerCount }),
    };
  }
}

module.exports = new TournamentService();
