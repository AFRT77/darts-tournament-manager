const { supabaseAdmin } = require('../config/supabase');
const tournamentService = require('./tournament.service');
const bracketService = require('./bracket.service');
const { getAlMejorDeForMatch, legsToWin } = require('../utils/tournamentSettings');

class MatchService {
  ensureConfigured() {
    if (!supabaseAdmin) {
      const error = new Error('Supabase no configurado');
      error.statusCode = 503;
      throw error;
    }
  }

  mapMatch(row, playersMap = {}) {
    const player1 = row.player1_id ? playersMap[row.player1_id] : null;
    const player2 = row.player2_id ? playersMap[row.player2_id] : null;
    const winner = row.winner_id ? playersMap[row.winner_id] : null;

    return {
      id: row.id,
      tournamentId: row.tournament_id,
      player1Id: row.player1_id,
      player2Id: row.player2_id,
      player1: player1 || null,
      player2: player2 || null,
      round: row.round,
      bracketPosition: row.bracket_position,
      groupNumber: row.group_number,
      status: row.status,
      winnerId: row.winner_id,
      winner: winner || null,
      player1LegsWon: row.player1_legs_won,
      player2LegsWon: row.player2_legs_won,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async buildPlayersMap(tournamentId) {
    const enrolled = await tournamentService.listPlayers(tournamentId);
    const map = {};

    enrolled.forEach((entry) => {
      if (entry.player) {
        map[entry.playerId] = {
          id: entry.player.id,
          name: entry.player.name,
          nickname: entry.player.nickname,
        };
      }
    });

    return map;
  }

  async listByTournament(tournamentId) {
    this.ensureConfigured();
    await tournamentService.getById(tournamentId);

    const { data, error } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('round', { ascending: true })
      .order('bracket_position', { ascending: true });

    if (error) {
      const listError = new Error('No se pudieron obtener los enfrentamientos');
      listError.statusCode = 500;
      throw listError;
    }

    const playersMap = await this.buildPlayersMap(tournamentId);
    return (data || []).map((row) => this.mapMatch(row, playersMap));
  }

  async getById(matchId) {
    this.ensureConfigured();

    const { data, error } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .maybeSingle();

    if (error) {
      const fetchError = new Error('No se pudo obtener el enfrentamiento');
      fetchError.statusCode = 500;
      throw fetchError;
    }

    if (!data) {
      const notFoundError = new Error('Enfrentamiento no encontrado');
      notFoundError.statusCode = 404;
      throw notFoundError;
    }

    const playersMap = await this.buildPlayersMap(data.tournament_id);
    return this.mapMatch(data, playersMap);
  }

  async generateForTournament(tournamentId) {
    this.ensureConfigured();

    const tournament = await tournamentService.getById(tournamentId);

    if (tournament.status !== 'active') {
      const statusError = new Error('Solo se pueden generar enfrentamientos en torneos activos');
      statusError.statusCode = 409;
      throw statusError;
    }

    const { count, error: countError } = await supabaseAdmin
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId);

    if (countError) {
      const checkError = new Error('No se pudo comprobar los enfrentamientos existentes');
      checkError.statusCode = 500;
      throw checkError;
    }

    if ((count || 0) > 0) {
      const existsError = new Error('Este torneo ya tiene enfrentamientos generados');
      existsError.statusCode = 409;
      throw existsError;
    }

    const enrolled = await tournamentService.listPlayers(tournamentId);
    const players = enrolled.map((entry) => ({
      playerId: entry.playerId,
      seed: entry.seed,
    }));

    const generated = bracketService.generateMatches(
      tournament.format,
      players,
      tournament.settings
    );

    const rows = generated.map((match) => ({
      tournament_id: tournamentId,
      player1_id: match.player1_id,
      player2_id: match.player2_id,
      round: match.round,
      bracket_position: match.bracket_position,
      group_number: match.group_number,
      status: match.status || 'scheduled',
      winner_id: match.winner_id || null,
      player1_legs_won: match.player1_legs_won || 0,
      player2_legs_won: match.player2_legs_won || 0,
    }));

    const { error: insertError } = await supabaseAdmin
      .from('matches')
      .insert(rows);

    if (insertError) {
      const createError = new Error(insertError.message || 'No se pudieron crear los enfrentamientos');
      createError.statusCode = 400;
      throw createError;
    }

    if (tournament.format === 'groups_knockout') {
      await this.assignGroupNumbers(tournamentId, players, tournament.settings?.groupCount || 4);
    }

    await this.advanceWalkoverWinners(tournamentId, tournament);

    return this.listByTournament(tournamentId);
  }

  async advanceWalkoverWinners(tournamentId, tournament) {
    const matches = await this.listByTournament(tournamentId);
    const walkovers = matches.filter((match) => match.status === 'walkover' && match.winnerId);

    for (const match of walkovers) {
      await this.advanceWinner(tournamentId, match, tournament);
    }
  }

  async assignGroupNumbers(tournamentId, players, groupCount) {
    const sorted = [...players].sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999));

    await Promise.all(sorted.map((player, index) => supabaseAdmin
      .from('tournament_players')
      .update({ group_number: (index % groupCount) + 1 })
      .eq('tournament_id', tournamentId)
      .eq('player_id', player.playerId)));
  }

  splitMatchesByPhase(matches) {
    return {
      groupMatches: matches.filter((match) => match.groupNumber != null),
      knockoutMatches: matches.filter((match) => match.groupNumber == null),
    };
  }

  async advanceWinner(tournamentId, match, tournament) {
    const shouldAdvance = tournament.format === 'knockout'
      || (tournament.format === 'groups_knockout' && match.groupNumber == null);

    if (!shouldAdvance) {
      return;
    }

    const next = bracketService.getNextMatchSlot(match.round, match.bracketPosition);
    const { data: nextMatches, error } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('round', next.round)
      .eq('bracket_position', next.bracketPosition)
      .limit(1);

    if (error || !nextMatches?.length) {
      return;
    }

    const nextMatch = nextMatches[0];
    const updatePayload = {};

    if (!nextMatch[next.slot]) {
      updatePayload[next.slot] = match.winnerId;
    }

    if (Object.keys(updatePayload).length === 0) {
      return;
    }

    const player1Id = next.slot === 'player1_id' ? match.winnerId : nextMatch.player1_id;
    const player2Id = next.slot === 'player2_id' ? match.winnerId : nextMatch.player2_id;

    if (player1Id && player2Id) {
      updatePayload.status = 'scheduled';
    }

    await supabaseAdmin
      .from('matches')
      .update(updatePayload)
      .eq('id', nextMatch.id);
  }

  validateManualResult({ player1LegsWon, player2LegsWon, requiredLegs, alMejorDe }) {
    if (player1LegsWon === player2LegsWon) {
      const tieError = new Error('El resultado no puede quedar en empate');
      tieError.statusCode = 422;
      throw tieError;
    }

    if (player1LegsWon > alMejorDe || player2LegsWon > alMejorDe) {
      const maxError = new Error(`Ningún jugador puede superar ${alMejorDe} partidas ganadas`);
      maxError.statusCode = 422;
      throw maxError;
    }

    if (player1LegsWon < requiredLegs && player2LegsWon < requiredLegs) {
      const minError = new Error(`Un jugador debe alcanzar ${requiredLegs} partidas ganadas`);
      minError.statusCode = 422;
      throw minError;
    }

    if (player1LegsWon >= requiredLegs && player2LegsWon >= requiredLegs) {
      const bothError = new Error('Solo un jugador puede alcanzar las partidas necesarias para ganar');
      bothError.statusCode = 422;
      throw bothError;
    }

    return player1LegsWon >= requiredLegs ? 'player1' : 'player2';
  }

  async clearWinnerAdvance(tournamentId, match, tournament) {
    const isKnockoutMatch = match.groupNumber == null;
    const shouldClear = tournament.format === 'knockout'
      || (tournament.format === 'groups_knockout' && isKnockoutMatch);

    if (!shouldClear) {
      return;
    }

    const next = bracketService.getNextMatchSlot(match.round, match.bracketPosition);
    const { data: nextMatches } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('round', next.round)
      .eq('bracket_position', next.bracketPosition)
      .limit(1);

    if (!nextMatches?.length) {
      return;
    }

    const nextMatch = nextMatches[0];
    const updatePayload = {
      [next.slot]: null,
      winner_id: null,
      player1_legs_won: 0,
      player2_legs_won: 0,
      status: 'scheduled',
    };

    await supabaseAdmin
      .from('matches')
      .update(updatePayload)
      .eq('id', nextMatch.id);
  }

  async updateResult(matchId, { player1LegsWon, player2LegsWon }) {
    this.ensureConfigured();

    const match = await this.getById(matchId);
    const tournament = await tournamentService.getById(match.tournamentId);

    if (tournament.status !== 'active') {
      const statusError = new Error('Solo se pueden editar resultados en torneos activos');
      statusError.statusCode = 409;
      throw statusError;
    }

    if (!match.player1Id || !match.player2Id) {
      const playersError = new Error('El enfrentamiento necesita dos jugadores');
      playersError.statusCode = 409;
      throw playersError;
    }

    const alMejorDe = getAlMejorDeForMatch(tournament.settings, match, tournament.format);
    const requiredLegs = legsToWin(alMejorDe);
    const winnerSide = this.validateManualResult({
      player1LegsWon,
      player2LegsWon,
      requiredLegs,
      alMejorDe,
    });
    const winnerId = winnerSide === 'player1' ? match.player1Id : match.player2Id;

    if (match.winnerId && match.winnerId !== winnerId) {
      await this.clearWinnerAdvance(match.tournamentId, match, tournament);
    }

    await supabaseAdmin
      .from('match_legs')
      .delete()
      .eq('match_id', matchId);

    const { data: updated, error } = await supabaseAdmin
      .from('matches')
      .update({
        player1_legs_won: player1LegsWon,
        player2_legs_won: player2LegsWon,
        winner_id: winnerId,
        status: 'finished',
      })
      .eq('id', matchId)
      .select('*')
      .single();

    if (error) {
      const saveError = new Error('No se pudo actualizar el resultado');
      saveError.statusCode = 500;
      throw saveError;
    }

    const mapped = this.mapMatch(updated, await this.buildPlayersMap(match.tournamentId));
    await this.advanceWinner(match.tournamentId, mapped, tournament);

    return mapped;
  }

  async resetMatch(matchId) {
    this.ensureConfigured();

    const match = await this.getById(matchId);
    const tournament = await tournamentService.getById(match.tournamentId);

    if (tournament.status !== 'active') {
      const statusError = new Error('Solo se pueden rehacer partidos en torneos activos');
      statusError.statusCode = 409;
      throw statusError;
    }

    if (match.winnerId) {
      await this.clearWinnerAdvance(match.tournamentId, match, tournament);
    }

    await supabaseAdmin
      .from('match_legs')
      .delete()
      .eq('match_id', matchId);

    const { data: updated, error } = await supabaseAdmin
      .from('matches')
      .update({
        status: 'scheduled',
        winner_id: null,
        player1_legs_won: 0,
        player2_legs_won: 0,
      })
      .eq('id', matchId)
      .select('*')
      .single();

    if (error) {
      const saveError = new Error('No se pudo rehacer el partido');
      saveError.statusCode = 500;
      throw saveError;
    }

    return this.mapMatch(updated, await this.buildPlayersMap(match.tournamentId));
  }

  async generateKnockoutPhase(tournamentId) {
    this.ensureConfigured();

    const tournament = await tournamentService.getById(tournamentId);

    if (tournament.format !== 'groups_knockout') {
      const formatError = new Error('Solo aplica a torneos de grupos + eliminatoria');
      formatError.statusCode = 409;
      throw formatError;
    }

    if (tournament.status !== 'active') {
      const statusError = new Error('El torneo debe estar activo');
      statusError.statusCode = 409;
      throw statusError;
    }

    const matches = await this.listByTournament(tournamentId);
    const { groupMatches, knockoutMatches } = this.splitMatchesByPhase(matches);

    if (!groupMatches.length) {
      const groupsError = new Error('Primero debes generar la fase de grupos');
      groupsError.statusCode = 409;
      throw groupsError;
    }

    if (knockoutMatches.length > 0) {
      const existsError = new Error('La eliminatoria ya está generada');
      existsError.statusCode = 409;
      throw existsError;
    }

    const unfinishedGroup = groupMatches.some((match) => !['finished', 'walkover'].includes(match.status));
    if (unfinishedGroup) {
      const pendingError = new Error('Debes completar todos los partidos de grupos antes de generar la eliminatoria');
      pendingError.statusCode = 409;
      throw pendingError;
    }

    const qualifierIds = await this.resolveKnockoutQualifiers(tournamentId, tournament);
    const players = qualifierIds.map((playerId, index) => ({
      playerId,
      seed: index + 1,
    }));

    const generated = bracketService.buildKnockoutMatches(players);
    const minGroupRound = Math.max(...groupMatches.map((match) => match.round));
    const roundOffset = minGroupRound;

    const rows = generated.map((match) => ({
      tournament_id: tournamentId,
      player1_id: match.player1_id,
      player2_id: match.player2_id,
      round: match.round + roundOffset,
      bracket_position: match.bracket_position,
      group_number: null,
      status: match.status || 'scheduled',
      winner_id: match.winner_id || null,
      player1_legs_won: match.player1_legs_won || 0,
      player2_legs_won: match.player2_legs_won || 0,
    }));

    const { error: insertError } = await supabaseAdmin
      .from('matches')
      .insert(rows);

    if (insertError) {
      const createError = new Error(insertError.message || 'No se pudo generar la eliminatoria');
      createError.statusCode = 400;
      throw createError;
    }

    await this.advanceWalkoverWinners(tournamentId, tournament);

    return this.listByTournament(tournamentId);
  }

  async resolveKnockoutQualifiers(tournamentId, tournament) {
    const manual = tournament.settings?.knockoutQualifiers;

    if (Array.isArray(manual) && manual.length) {
      return manual.flatMap((entry) => entry.playerIds);
    }

    const standingsService = require('./standings.service');
    const standings = await standingsService.getStandings(tournamentId);
    const qualifiersPerGroup = tournament.settings?.qualifiersPerGroup || 2;
    const ids = [];

    (standings.groups || []).forEach((group) => {
      group.standings.slice(0, qualifiersPerGroup).forEach((entry) => {
        ids.push(entry.playerId);
      });
    });

    if (ids.length < 2) {
      const error = new Error('No hay suficientes clasificados para la eliminatoria');
      error.statusCode = 409;
      throw error;
    }

    return ids;
  }

  async recordLeg(matchId, { winnerId }) {
    this.ensureConfigured();

    const match = await this.getById(matchId);

    if (!['scheduled', 'in_progress'].includes(match.status)) {
      const statusError = new Error('Este enfrentamiento no admite más partidas');
      statusError.statusCode = 409;
      throw statusError;
    }

    if (winnerId !== match.player1Id && winnerId !== match.player2Id) {
      const winnerError = new Error('El ganador de la partida debe ser uno de los jugadores del enfrentamiento');
      winnerError.statusCode = 422;
      throw winnerError;
    }

    const tournament = await tournamentService.getById(match.tournamentId);
    const alMejorDe = getAlMejorDeForMatch(tournament.settings, match, tournament.format);
    const requiredLegs = legsToWin(alMejorDe);

    const { count: legCount, error: countError } = await supabaseAdmin
      .from('match_legs')
      .select('*', { count: 'exact', head: true })
      .eq('match_id', matchId);

    if (countError) {
      const legError = new Error('No se pudo comprobar las partidas registradas');
      legError.statusCode = 500;
      throw legError;
    }

    const legNumber = (legCount || 0) + 1;

    const { error: legInsertError } = await supabaseAdmin
      .from('match_legs')
      .insert({
        match_id: matchId,
        leg_number: legNumber,
        player1_score: winnerId === match.player1Id ? 1 : 0,
        player2_score: winnerId === match.player2Id ? 1 : 0,
        winner_id: winnerId,
      });

    if (legInsertError) {
      const insertError = new Error('No se pudo registrar la partida');
      insertError.statusCode = 400;
      throw insertError;
    }

    const player1LegsWon = match.player1LegsWon + (winnerId === match.player1Id ? 1 : 0);
    const player2LegsWon = match.player2LegsWon + (winnerId === match.player2Id ? 1 : 0);

    const updatePayload = {
      player1_legs_won: player1LegsWon,
      player2_legs_won: player2LegsWon,
      status: 'in_progress',
    };

    let finishedMatch = null;

    if (player1LegsWon >= requiredLegs || player2LegsWon >= requiredLegs) {
      updatePayload.status = 'finished';
      updatePayload.winner_id = player1LegsWon >= requiredLegs ? match.player1Id : match.player2Id;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('matches')
      .update(updatePayload)
      .eq('id', matchId)
      .select('*')
      .single();

    if (updateError) {
      const saveError = new Error('No se pudo actualizar el enfrentamiento');
      saveError.statusCode = 500;
      throw saveError;
    }

    finishedMatch = this.mapMatch(updated, await this.buildPlayersMap(match.tournamentId));

    if (finishedMatch.status === 'finished') {
      await this.advanceWinner(match.tournamentId, finishedMatch, tournament);
    }

    const legs = await this.listLegs(matchId);

    return {
      match: finishedMatch,
      legs,
    };
  }

  async listLegs(matchId) {
    const { data, error } = await supabaseAdmin
      .from('match_legs')
      .select('*')
      .eq('match_id', matchId)
      .order('leg_number', { ascending: true });

    if (error) {
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      matchId: row.match_id,
      legNumber: row.leg_number,
      player1Score: row.player1_score,
      player2Score: row.player2_score,
      winnerId: row.winner_id,
      createdAt: row.created_at,
    }));
  }

  async setWalkover(matchId, { winnerId }) {
    const match = await this.getById(matchId);

    if (match.status === 'finished' || match.status === 'walkover') {
      const statusError = new Error('Este enfrentamiento ya está cerrado');
      statusError.statusCode = 409;
      throw statusError;
    }

    const tournament = await tournamentService.getById(match.tournamentId);

    const { data: updated, error } = await supabaseAdmin
      .from('matches')
      .update({
        status: 'walkover',
        winner_id: winnerId,
        player1_legs_won: winnerId === match.player1Id ? 1 : 0,
        player2_legs_won: winnerId === match.player2Id ? 1 : 0,
      })
      .eq('id', matchId)
      .select('*')
      .single();

    if (error) {
      const saveError = new Error('No se pudo registrar la victoria por walkover');
      saveError.statusCode = 500;
      throw saveError;
    }

    const mapped = this.mapMatch(updated, await this.buildPlayersMap(match.tournamentId));
    await this.advanceWinner(match.tournamentId, mapped, tournament);

    return mapped;
  }

  async getBracket(tournamentId) {
    const tournament = await tournamentService.getById(tournamentId);
    const matches = await this.listByTournament(tournamentId);

    const rounds = {};

    matches.forEach((match) => {
      if (!rounds[match.round]) {
        rounds[match.round] = [];
      }
      rounds[match.round].push(match);
    });

    return {
      tournamentId,
      format: tournament.format,
      rounds: Object.keys(rounds)
        .sort((a, b) => Number(a) - Number(b))
        .map((round) => ({
          round: Number(round),
          matches: rounds[round],
        })),
    };
  }
}

module.exports = new MatchService();
