import { apiRequest } from '../api/client.js';
import { logout } from '../auth/session.js';
import { requireAuth } from '../auth/guard.js';
import { renderStandingsBlock } from '../utils/standings.js';
import {
  STATUS_LABELS,
  STATUS_BADGES,
  MATCH_STATUS_LABELS,
  MATCH_STATUS_BADGES,
  formatLabel,
  formatAlMejorDeDetalle,
} from '../utils/tournaments.js';

const tournamentId = new URLSearchParams(window.location.search).get('id');
const tournamentTitle = document.getElementById('tournament-title');
const tournamentStatusBadge = document.getElementById('tournament-status-badge');
const standingsContainer = document.getElementById('standings-container');
const matchesContainer = document.getElementById('matches-container');
const pageAlert = document.getElementById('page-alert');
const logoutButton = document.getElementById('logout-btn');

function showAlert(message) {
  pageAlert.textContent = message;
  pageAlert.className = 'alert alert-danger';
  pageAlert.classList.remove('d-none');
}

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

function renderMatches(matches, tournament) {
  if (!matches.length) {
    matchesContainer.innerHTML = '<p class="text-muted mb-0">Todavía no hay enfrentamientos.</p>';
    return;
  }

  matchesContainer.innerHTML = matches.map((match) => `
    <div class="border rounded p-3 mb-3 bg-white">
      <div class="d-flex justify-content-between gap-2 mb-2">
        <div>
          <strong>${escapeHtml(playerName(match.player1))}</strong>
          <span class="mx-1">vs</span>
          <strong>${escapeHtml(playerName(match.player2))}</strong>
        </div>
        <span class="badge ${MATCH_STATUS_BADGES[match.status] || 'text-bg-secondary'}">
          ${formatLabel(MATCH_STATUS_LABELS, match.status)}
        </span>
      </div>
      <div class="small text-muted">
        Partidas ganadas: ${match.player1LegsWon} - ${match.player2LegsWon}
        · ${formatAlMejorDeDetalle(tournament.settings)}
      </div>
      ${match.winner ? `<div class="small mt-2"><strong>Ganador:</strong> ${escapeHtml(playerName(match.winner))}</div>` : ''}
    </div>
  `).join('');
}

async function init() {
  if (!tournamentId) {
    showAlert('Torneo no especificado.');
    return;
  }

  const auth = await requireAuth();
  if (!auth) return;

  try {
    const [tournamentResponse, standingsResponse, matchesResponse] = await Promise.all([
      apiRequest(`/tournaments/${tournamentId}`),
      apiRequest(`/tournaments/${tournamentId}/standings`),
      apiRequest(`/tournaments/${tournamentId}/matches`),
    ]);

    const tournament = tournamentResponse.data;
    tournamentTitle.textContent = tournament.name;
    tournamentStatusBadge.className = `badge ${STATUS_BADGES[tournament.status] || 'text-bg-secondary'}`;
    tournamentStatusBadge.textContent = formatLabel(STATUS_LABELS, tournament.status);

    standingsContainer.innerHTML = renderStandingsBlock(standingsResponse.data);
    renderMatches(matchesResponse.data || [], tournament);
  } catch (error) {
    showAlert(error.message);
  }
}

logoutButton.addEventListener('click', logout);
init();
