const matchService = require('./match.service');
const tournamentService = require('./tournament.service');

class StandingsService {
  createStandingEntry(player) {
    return {
      playerId: player.playerId,
      player: player.player,
      played: 0,
      won: 0,
      lost: 0,
      points: 0,
      partidasGanadas: 0,
      partidasPerdidas: 0,
      diferenciaPartidas: 0,
      groupNumber: player.groupNumber ?? null,
    };
  }

  async getStandings(tournamentId, { group = null } = {}) {
    const tournament = await tournamentService.getById(tournamentId);
    const enrolled = await tournamentService.listPlayers(tournamentId);
    const matches = await matchService.listByTournament(tournamentId);

    const finishedMatches = matches.filter(
      (match) => ['finished', 'walkover'].includes(match.status) && match.player1Id && match.player2Id
    );

    const standingsMap = new Map();

    enrolled.forEach((entry) => {
      if (group && entry.groupNumber !== Number(group)) {
        return;
      }

      standingsMap.set(entry.playerId, this.createStandingEntry({
        playerId: entry.playerId,
        player: entry.player,
        groupNumber: entry.groupNumber ?? null,
      }));
    });

    finishedMatches.forEach((match) => {
      if (group && match.groupNumber !== Number(group)) {
        return;
      }

      if (tournament.format === 'groups_knockout' && group && !match.groupNumber) {
        return;
      }

      const player1 = standingsMap.get(match.player1Id);
      const player2 = standingsMap.get(match.player2Id);

      if (!player1 || !player2) {
        return;
      }

      player1.played += 1;
      player2.played += 1;
      player1.partidasGanadas += match.player1LegsWon;
      player1.partidasPerdidas += match.player2LegsWon;
      player2.partidasGanadas += match.player2LegsWon;
      player2.partidasPerdidas += match.player1LegsWon;

      if (match.winnerId === match.player1Id) {
        player1.won += 1;
        player1.points += 3;
        player2.lost += 1;
      } else if (match.winnerId === match.player2Id) {
        player2.won += 1;
        player2.points += 3;
        player1.lost += 1;
      }
    });

    let standings = [...standingsMap.values()].map((entry) => ({
      ...entry,
      diferenciaPartidas: entry.partidasGanadas - entry.partidasPerdidas,
    }));

    if (tournament.format === 'groups_knockout' && !group) {
      return this.getGroupedStandings(tournamentId, enrolled, finishedMatches);
    }

    standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.diferenciaPartidas !== a.diferenciaPartidas) return b.diferenciaPartidas - a.diferenciaPartidas;
      if (b.partidasGanadas !== a.partidasGanadas) return b.partidasGanadas - a.partidasGanadas;
      return (a.player?.name || '').localeCompare(b.player?.name || '');
    });

    standings = standings.map((entry, index) => ({
      ...entry,
      position: index + 1,
    }));

    return {
      tournamentId,
      format: tournament.format,
      group: group ? Number(group) : null,
      standings,
    };
  }

  async getGroupedStandings(tournamentId, enrolled, finishedMatches) {
    const tournament = await tournamentService.getById(tournamentId);
    let groupNumbers = [...new Set(finishedMatches.map((match) => match.groupNumber).filter(Boolean))];

    if (!groupNumbers.length) {
      const groupCount = tournament.settings?.groupCount || 4;
      groupNumbers = Array.from({ length: groupCount }, (_, index) => index + 1);
    }

    const grouped = await Promise.all(
      groupNumbers.sort((a, b) => a - b).map(async (groupNumber) => {
        const result = await this.getStandings(tournamentId, { group: groupNumber });
        return {
          groupNumber,
          standings: result.standings,
        };
      })
    );

    return {
      tournamentId,
      format: 'groups_knockout',
      groups: grouped,
    };
  }
}

module.exports = new StandingsService();
