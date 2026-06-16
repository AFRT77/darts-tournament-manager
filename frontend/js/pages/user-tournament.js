import { apiRequest } from '../api/client.js';
import { logout } from '../auth/session.js';
import { requireAuth } from '../auth/guard.js';
import { renderStandingsBlock } from '../utils/standings.js';
import { renderMatchesView, shouldUseBracketView } from '../utils/bracket.js';
import {
  STATUS_LABELS,
  STATUS_BADGES,
  formatLabel,
} from '../utils/tournaments.js';

const tournamentId = new URLSearchParams(window.location.search).get('id');
const tournamentTitle = document.getElementById('tournament-title');
const tournamentStatusBadge = document.getElementById('tournament-status-badge');
const standingsContainer = document.getElementById('standings-container');
const matchesContainer = document.getElementById('matches-container');
const matchesCard = document.getElementById('matches-card');
const pageAlert = document.getElementById('page-alert');
const logoutButton = document.getElementById('logout-btn');

function showAlert(message) {
  pageAlert.textContent = message;
  pageAlert.className = 'alert alert-danger';
  pageAlert.classList.remove('d-none');
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
    const matches = matchesResponse.data || [];

    tournamentTitle.textContent = tournament.name;
    tournamentStatusBadge.className = `badge ${STATUS_BADGES[tournament.status] || 'text-bg-secondary'}`;
    tournamentStatusBadge.textContent = formatLabel(STATUS_LABELS, tournament.status);

    standingsContainer.innerHTML = renderStandingsBlock(standingsResponse.data);

    const useBracket = shouldUseBracketView(tournament, matches);
    matchesCard?.classList.toggle('matches-card--bracket', useBracket);

    matchesContainer.innerHTML = renderMatchesView(matches, tournament, {
      emptyMessage: '<p class="text-muted mb-0">Todavía no hay enfrentamientos.</p>',
    });
  } catch (error) {
    showAlert(error.message);
  }
}

logoutButton.addEventListener('click', logout);
init();
