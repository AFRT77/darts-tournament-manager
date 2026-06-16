const { supabaseAdmin } = require('../config/supabase');
const matchService = require('./match.service');
const tournamentService = require('./tournament.service');
const standingsService = require('./standings.service');

class StatsService {
  ensureConfigured() {
    if (!supabaseAdmin) {
      const error = new Error('Supabase no configurado');
      error.statusCode = 503;
      throw error;
    }
  }

  async getGlobalStats() {
    this.ensureConfigured();

    const { data: players, error: playersError } = await supabaseAdmin
      .from('players')
      .select('id, name, nickname, ranking_points, active')
      .eq('active', true)
      .order('ranking_points', { ascending: false });

    if (playersError) {
      const fetchError = new Error('No se pudieron obtener las estadísticas globales');
      fetchError.statusCode = 500;
      throw fetchError;
    }

    const stats = await Promise.all(
      (players || []).map(async (player) => {
        const playerStats = await this.calculatePlayerStats(player.id);
        return {
          playerId: player.id,
          name: player.name,
          nickname: player.nickname,
          rankingPoints: player.ranking_points,
          ...playerStats,
        };
      })
    );

    stats.sort((a, b) => {
      if (b.torneosGanados !== a.torneosGanados) return b.torneosGanados - a.torneosGanados;
      if (b.enfrentamientosGanados !== a.enfrentamientosGanados) return b.enfrentamientosGanados - a.enfrentamientosGanados;
      return b.rankingPoints - a.rankingPoints;
    });

    return stats;
  }

  async getPlayerStats(playerId) {
    this.ensureConfigured();

    const { data: player, error } = await supabaseAdmin
      .from('players')
      .select('id, name, nickname, ranking_points, active')
      .eq('id', playerId)
      .maybeSingle();

    if (error) {
      const fetchError = new Error('No se pudieron obtener las estadísticas del jugador');
      fetchError.statusCode = 500;
      throw fetchError;
    }

    if (!player) {
      const notFoundError = new Error('Jugador no encontrado');
      notFoundError.statusCode = 404;
      throw notFoundError;
    }

    const stats = await this.calculatePlayerStats(playerId);

    return {
      playerId: player.id,
      name: player.name,
      nickname: player.nickname,
      rankingPoints: player.ranking_points,
      active: player.active,
      ...stats,
    };
  }

  async getTournamentStats(tournamentId) {
    const tournament = await tournamentService.getById(tournamentId);
    const matches = await matchService.listByTournament(tournamentId);
    const finished = matches.filter((match) => ['finished', 'walkover'].includes(match.status));

    return {
      tournamentId,
      name: tournament.name,
      status: tournament.status,
      totalEnfrentamientos: matches.length,
      enfrentamientosFinalizados: finished.length,
      enfrentamientosPendientes: matches.length - finished.length,
    };
  }

  async calculatePlayerStats(playerId) {
    const { data: tournamentLinks, error: linksError } = await supabaseAdmin
      .from('tournament_players')
      .select('tournament_id, tournaments(status, name)')
      .eq('player_id', playerId);

    if (linksError) {
      return this.emptyPlayerStats();
    }

    const tournamentIds = (tournamentLinks || []).map((row) => row.tournament_id);
    let enfrentamientosJugados = 0;
    let enfrentamientosGanados = 0;
    let enfrentamientosPerdidos = 0;
    let partidasGanadas = 0;
    let partidasPerdidas = 0;
    let torneosGanados = 0;

    for (const tournamentId of tournamentIds) {
      const matches = await matchService.listByTournament(tournamentId);
      const playerMatches = matches.filter(
        (match) => ['finished', 'walkover'].includes(match.status)
          && (match.player1Id === playerId || match.player2Id === playerId)
      );

      playerMatches.forEach((match) => {
        enfrentamientosJugados += 1;
        partidasGanadas += match.player1Id === playerId ? match.player1LegsWon : match.player2LegsWon;
        partidasPerdidas += match.player1Id === playerId ? match.player2LegsWon : match.player1LegsWon;

        if (match.winnerId === playerId) {
          enfrentamientosGanados += 1;
        } else if (match.winnerId) {
          enfrentamientosPerdidos += 1;
        }
      });

      const tournament = await tournamentService.getById(tournamentId);

      if (tournament.status === 'finished') {
        const standingsResult = await standingsService.getStandings(tournamentId);
        const winnerIds = this.extractWinnersFromStandings(standingsResult);

        if (winnerIds.includes(playerId)) {
          torneosGanados += 1;
        }
      }
    }

    const torneosJugados = tournamentIds.length;
    const porcentajeVictorias = enfrentamientosJugados
      ? Math.round((enfrentamientosGanados / enfrentamientosJugados) * 100)
      : 0;

    return {
      torneosJugados,
      torneosGanados,
      enfrentamientosJugados,
      enfrentamientosGanados,
      enfrentamientosPerdidos,
      partidasGanadas,
      partidasPerdidas,
      porcentajeVictorias,
    };
  }

  emptyPlayerStats() {
    return {
      torneosJugados: 0,
      torneosGanados: 0,
      enfrentamientosJugados: 0,
      enfrentamientosGanados: 0,
      enfrentamientosPerdidos: 0,
      partidasGanadas: 0,
      partidasPerdidas: 0,
      porcentajeVictorias: 0,
    };
  }

  extractWinnersFromStandings(standingsResult) {
    if (standingsResult.groups) {
      return standingsResult.groups.flatMap(
        (group) => group.standings.filter((entry) => entry.position === 1).map((entry) => entry.playerId)
      );
    }

    return standingsResult.standings
      .filter((entry) => entry.position === 1)
      .map((entry) => entry.playerId);
  }
}

module.exports = new StatsService();
