function nextPowerOf2(value) {
  let size = 1;
  while (size < value) {
    size *= 2;
  }
  return size;
}

function buildRoundRobinMatches(players) {
  const matches = [];

  for (let i = 0; i < players.length; i += 1) {
    for (let j = i + 1; j < players.length; j += 1) {
      matches.push({
        round: 1,
        bracket_position: matches.length + 1,
        group_number: null,
        player1_id: players[i].playerId,
        player2_id: players[j].playerId,
        status: 'scheduled',
      });
    }
  }

  return matches;
}

function buildGroupStageMatches(players, groupCount) {
  const groups = Array.from({ length: groupCount }, () => []);

  players.forEach((player, index) => {
    groups[index % groupCount].push(player);
  });

  const matches = [];

  groups.forEach((groupPlayers, groupIndex) => {
    for (let i = 0; i < groupPlayers.length; i += 1) {
      for (let j = i + 1; j < groupPlayers.length; j += 1) {
        matches.push({
          round: 1,
          bracket_position: matches.length + 1,
          group_number: groupIndex + 1,
          player1_id: groupPlayers[i].playerId,
          player2_id: groupPlayers[j].playerId,
          status: 'scheduled',
        });
      }
    }
  });

  return matches;
}

function buildKnockoutMatches(players) {
  const sorted = [...players].sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999));
  const bracketSize = nextPowerOf2(sorted.length);
  const totalRounds = Math.log2(bracketSize);
  const slots = new Array(bracketSize).fill(null);

  sorted.forEach((player, index) => {
    slots[index] = player;
  });

  const matches = [];

  for (let round = 1; round <= totalRounds; round += 1) {
    const matchesInRound = bracketSize / (2 ** round);

    for (let position = 1; position <= matchesInRound; position += 1) {
      if (round === 1) {
        const slotIndex = (position - 1) * 2;
        const player1 = slots[slotIndex];
        const player2 = slots[slotIndex + 1];

        if (player1 && player2) {
          matches.push({
            round,
            bracket_position: position,
            group_number: null,
            player1_id: player1.playerId,
            player2_id: player2.playerId,
            status: 'scheduled',
          });
        } else if (player1 || player2) {
          const winner = player1 || player2;
          matches.push({
            round,
            bracket_position: position,
            group_number: null,
            player1_id: winner.playerId,
            player2_id: null,
            status: 'walkover',
            winner_id: winner.playerId,
            player1_legs_won: 1,
            player2_legs_won: 0,
          });
        }
      } else {
        matches.push({
          round,
          bracket_position: position,
          group_number: null,
          player1_id: null,
          player2_id: null,
          status: 'scheduled',
        });
      }
    }
  }

  return matches;
}

function generateMatches(format, players, settings = {}) {
  if (players.length < 2) {
    throw new Error('Se necesitan al menos 2 jugadores inscritos');
  }

  switch (format) {
    case 'round_robin':
      return buildRoundRobinMatches(players);
    case 'groups_knockout':
      return buildGroupStageMatches(players, settings.groupCount || 4);
    case 'knockout':
    default:
      return buildKnockoutMatches(players);
  }
}

function getNextMatchSlot(round, bracketPosition) {
  return {
    round: round + 1,
    bracketPosition: Math.ceil(bracketPosition / 2),
    slot: bracketPosition % 2 === 1 ? 'player1_id' : 'player2_id',
  };
}

module.exports = {
  generateMatches,
  getNextMatchSlot,
  nextPowerOf2,
  legsToWin: require('../utils/tournamentSettings').legsToWin,
};
