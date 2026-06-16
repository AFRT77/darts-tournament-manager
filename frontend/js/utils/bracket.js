import {
  MATCH_STATUS_LABELS,
  formatLabel,
  formatAlMejorDeDetalleForMatch,
} from './tournaments.js';

const ROUND_LABELS = ['Final', 'Semifinal', 'Cuartos', 'Octavos', 'Dieciseisavos'];

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function playerName(player) {
  if (!player) return 'Por definir';
  return player.nickname ? `${player.name} (${player.nickname})` : player.name;
}

function getKnockoutMatches(matches) {
  return matches.filter((match) => match.groupNumber == null);
}

function getGroupMatches(matches) {
  return matches.filter((match) => match.groupNumber != null);
}

function groupMatchesByRound(matches) {
  const rounds = {};

  matches.forEach((match) => {
    if (!rounds[match.round]) {
      rounds[match.round] = [];
    }
    rounds[match.round].push(match);
  });

  Object.keys(rounds).forEach((round) => {
    rounds[round].sort((a, b) => a.bracketPosition - b.bracketPosition);
  });

  return rounds;
}

function getRoundLabel(round, maxRound) {
  const index = maxRound - round;
  return ROUND_LABELS[index] || `Ronda ${round}`;
}

function getRoundStyleClass(round, minRound, maxRound) {
  if (round === maxRound) return 'bracket-match--final';
  if (round === minRound) return 'bracket-match--first';
  return 'bracket-match--mid';
}

function splitRoundMatches(roundMatches) {
  const half = Math.ceil(roundMatches.length / 2);
  return {
    left: roundMatches.slice(0, half),
    right: roundMatches.slice(half),
  };
}

function getChampion(finalMatch) {
  if (!finalMatch || !['finished', 'walkover'].includes(finalMatch.status)) {
    return null;
  }
  return finalMatch.winner;
}

function renderBracketSlot(player, legsWon, isWinner, isEmpty) {
  return `
    <div class="bracket-slot ${isWinner ? 'is-winner' : ''} ${isEmpty ? 'is-empty' : ''}">
      <span class="bracket-player">${escapeHtml(playerName(player))}</span>
      ${player ? `<span class="bracket-score">${legsWon ?? 0}</span>` : ''}
    </div>
  `;
}

function renderBracketMatch(match, tournament, roundClass, options = {}) {
  const { interactive = false } = options;
  const canRecord = interactive
    && tournament?.status === 'active'
    && ['scheduled', 'in_progress'].includes(match.status)
    && match.player1
    && match.player2;
  const canManage = interactive && tournament?.status === 'active' && match.player1 && match.player2;

  const p1Winner = match.winnerId && match.winnerId === match.player1Id;
  const p2Winner = match.winnerId && match.winnerId === match.player2Id;

  return `
    <div class="bracket-match-wrap">
      <div class="bracket-match ${roundClass}" data-match-id="${match.id}">
        ${renderBracketSlot(match.player1, match.player1LegsWon, p1Winner, !match.player1)}
        ${renderBracketSlot(match.player2, match.player2LegsWon, p2Winner, !match.player2)}
        <div class="bracket-match-meta">
          ${formatLabel(MATCH_STATUS_LABELS, match.status)}
          · ${formatAlMejorDeDetalleForMatch(tournament.settings, match, tournament.format)}
        </div>
        ${canRecord ? `
          <div class="bracket-match-actions">
            <button type="button" class="btn btn-sm btn-outline-light" data-leg-winner="${match.id}" data-winner-id="${match.player1Id}">
              +1 ${escapeHtml(match.player1.name)}
            </button>
            <button type="button" class="btn btn-sm btn-outline-light" data-leg-winner="${match.id}" data-winner-id="${match.player2Id}">
              +1 ${escapeHtml(match.player2.name)}
            </button>
          </div>
        ` : ''}
        ${interactive && canManage ? `
          <div class="bracket-match-actions">
            <button type="button" class="btn btn-sm btn-outline-light" data-edit-result="${match.id}">Editar</button>
            ${isMatchFinished(match) ? `
              <button type="button" class="btn btn-sm btn-outline-light" data-reset-match="${match.id}">Rehacer</button>
            ` : ''}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderRoundColumn(roundMatches, round, minRound, maxRound, tournament, options) {
  const roundClass = getRoundStyleClass(round, minRound, maxRound);

  return `
    <div class="bracket-round" data-round="${round}">
      <div class="bracket-round-label">${escapeHtml(getRoundLabel(round, maxRound))}</div>
      <div class="bracket-round-matches">
        ${roundMatches.map((match) => renderBracketMatch(match, tournament, roundClass, options)).join('')}
      </div>
    </div>
  `;
}

function renderKnockoutBracket(matches, tournament, options = {}) {
  const knockoutMatches = getKnockoutMatches(matches);

  if (!knockoutMatches.length) {
    return '';
  }

  const roundsMap = groupMatchesByRound(knockoutMatches);
  const roundNumbers = Object.keys(roundsMap).map(Number).sort((a, b) => a - b);
  const minRound = roundNumbers[0];
  const maxRound = roundNumbers[roundNumbers.length - 1];
  const finalMatch = roundsMap[maxRound]?.[0] || null;
  const champion = getChampion(finalMatch);

  const outerRounds = roundNumbers.filter((round) => round !== maxRound);
  const leftRounds = [];
  const rightRounds = [];

  outerRounds.forEach((round) => {
    const { left, right } = splitRoundMatches(roundsMap[round]);
    leftRounds.push({ round, matches: left });
    rightRounds.push({ round, matches: right });
  });

  const firstRoundCount = roundsMap[minRound]?.length || 1;
  const boardHeight = Math.max(firstRoundCount * 88, 280);

  return `
    <div class="bracket-board" style="--bracket-height: ${boardHeight}px">
      <div class="bracket-header">
        <div class="bracket-trophy" aria-hidden="true">🏆</div>
        <div class="bracket-winner-label">GANADOR</div>
        <div class="bracket-champion">${champion ? escapeHtml(playerName(champion)) : 'Por definir'}</div>
      </div>

      <div class="bracket-scroll">
        <div class="bracket-grid">
          <div class="bracket-side bracket-side--left">
            ${leftRounds.map(({ round, matches: roundMatches }) => renderRoundColumn(
              roundMatches,
              round,
              minRound,
              maxRound,
              tournament,
              options
            )).join('')}
          </div>

          <div class="bracket-center">
            ${finalMatch ? renderRoundColumn([finalMatch], maxRound, minRound, maxRound, tournament, options) : ''}
          </div>

          <div class="bracket-side bracket-side--right">
            ${[...rightRounds].reverse().map(({ round, matches: roundMatches }) => renderRoundColumn(
              roundMatches,
              round,
              minRound,
              maxRound,
              tournament,
              options
            )).join('')}
          </div>
        </div>
      </div>

      <div class="bracket-footer">CUADRO DEL TORNEO</div>
    </div>
  `;
}

function isMatchFinished(match) {
  return ['finished', 'walkover'].includes(match.status);
}

function renderGroupMatchCard(match, tournament, options = {}) {
  const { interactive = false } = options;
  const canRecord = interactive
    && tournament?.status === 'active'
    && ['scheduled', 'in_progress'].includes(match.status)
    && match.player1
    && match.player2;
  const canManage = interactive && tournament?.status === 'active' && match.player1 && match.player2;

  return `
    <div class="border rounded p-3 bg-white group-match-card">
      <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
        <div>
          <strong>${escapeHtml(playerName(match.player1))}</strong>
          <span class="mx-2">vs</span>
          <strong>${escapeHtml(playerName(match.player2))}</strong>
        </div>
        <span class="badge text-bg-secondary">${formatLabel(MATCH_STATUS_LABELS, match.status)}</span>
      </div>
      <div class="small text-muted mb-3">
        Partidas ganadas: ${match.player1LegsWon} - ${match.player2LegsWon}
        · ${formatAlMejorDeDetalleForMatch(tournament.settings, match, tournament.format)}
      </div>
      ${canRecord ? `
        <div class="d-flex flex-wrap gap-2 mb-2">
          <button type="button" class="btn btn-sm btn-outline-success" data-leg-winner="${match.id}" data-winner-id="${match.player1Id}">
            Gana ${escapeHtml(match.player1.name)}
          </button>
          <button type="button" class="btn btn-sm btn-outline-success" data-leg-winner="${match.id}" data-winner-id="${match.player2Id}">
            Gana ${escapeHtml(match.player2.name)}
          </button>
        </div>
      ` : ''}
      ${canManage ? `
        <div class="d-flex flex-wrap gap-2">
          <button type="button" class="btn btn-sm btn-outline-primary" data-edit-result="${match.id}">
            Editar resultado
          </button>
          ${isMatchFinished(match) ? `
            <button type="button" class="btn btn-sm btn-outline-warning" data-reset-match="${match.id}">
              Rehacer partido
            </button>
          ` : ''}
        </div>
      ` : ''}
      ${match.winner ? `<div class="small mt-2"><strong>Ganador:</strong> ${escapeHtml(playerName(match.winner))}</div>` : ''}
    </div>
  `;
}

function renderGroupStage(matches, tournament, options = {}) {
  const groupMatches = getGroupMatches(matches);

  if (!groupMatches.length) {
    return '';
  }

  const grouped = groupMatches.reduce((acc, match) => {
    const key = `Grupo ${match.groupNumber}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(match);
    return acc;
  }, {});

  return `
    <div class="group-stage-section mb-4">
      <h3 class="h6 mb-3">Fase de grupos</h3>
      ${Object.entries(grouped).map(([groupLabel, groupItems]) => `
        <div class="mb-4">
          <h4 class="h6 text-muted mb-3">${escapeHtml(groupLabel)}</h4>
          <div class="vstack gap-3">
            ${groupItems.map((match) => renderGroupMatchCard(match, tournament, options)).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function shouldUseBracketView(tournament, matches) {
  if (tournament.format === 'knockout') {
    return matches.length > 0;
  }

  if (tournament.format === 'groups_knockout') {
    return getKnockoutMatches(matches).length > 0;
  }

  return false;
}

function renderMatchesView(matches, tournament, options = {}) {
  if (!matches.length) {
    return options.emptyMessage || '<p class="text-muted mb-0">Todavía no hay enfrentamientos.</p>';
  }

  const parts = [];

  if (tournament.format === 'groups_knockout') {
    parts.push(renderGroupStage(matches, tournament, options));
  }

  if (shouldUseBracketView(tournament, matches)) {
    parts.push(renderKnockoutBracket(matches, tournament, options));
  } else if (tournament.format !== 'groups_knockout') {
    parts.push(`
      <div class="vstack gap-3">
        ${matches.map((match) => renderGroupMatchCard(match, tournament, options)).join('')}
      </div>
    `);
  }

  return parts.filter(Boolean).join('');
}

export {
  getKnockoutMatches,
  getGroupMatches,
  renderKnockoutBracket,
  renderMatchesView,
  shouldUseBracketView,
};
