import { apiRequest } from '../api/client.js';
import { logout } from '../auth/session.js';
import { requireAuth } from '../auth/guard.js';
import { renderStandingsBlock } from '../utils/standings.js';
import {
  FORMAT_LABELS,
  GAME_TYPE_LABELS,
  STATUS_LABELS,
  MATCH_STATUS_LABELS,
  STATUS_BADGES,
  MATCH_STATUS_BADGES,
  formatLabel,
  formatAlMejorDeDetalle,
  getAlMejorDe,
} from '../utils/tournaments.js';

const params = new URLSearchParams(window.location.search);
const tournamentId = params.get('id');

const userNameEl = document.getElementById('user-name');
const logoutButton = document.getElementById('logout-btn');
const pageAlert = document.getElementById('page-alert');
const tournamentTitle = document.getElementById('tournament-title');
const tournamentMeta = document.getElementById('tournament-meta');
const tournamentStatusBadge = document.getElementById('tournament-status-badge');
const enrolledTableBody = document.getElementById('enrolled-table-body');
const availablePlayersContainer = document.getElementById('available-players');
const startButton = document.getElementById('start-btn');
const finishButton = document.getElementById('finish-btn');
const generateMatchesButton = document.getElementById('generate-matches-btn');
const addPlayersButton = document.getElementById('add-players-btn');
const matchesContainer = document.getElementById('matches-container');
const matchesSummary = document.getElementById('matches-summary');
const standingsContainer = document.getElementById('standings-container');

let tournament = null;
let enrolledPlayers = [];
let availablePlayers = [];
let matches = [];

function showAlert(message, type = 'success') {
  pageAlert.textContent = message;
  pageAlert.className = `alert alert-${type}`;
  pageAlert.classList.remove('d-none');
}

function hideAlert() {
  pageAlert.classList.add('d-none');
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

function renderTournamentInfo() {
  if (!tournament) return;

  tournamentTitle.textContent = tournament.name;
  tournamentStatusBadge.className = `badge ${STATUS_BADGES[tournament.status] || 'text-bg-secondary'}`;
  tournamentStatusBadge.textContent = formatLabel(STATUS_LABELS, tournament.status);

  tournamentMeta.innerHTML = `
    <div><strong>Formato:</strong> ${formatLabel(FORMAT_LABELS, tournament.format)}</div>
    <div><strong>Juego:</strong> ${formatLabel(GAME_TYPE_LABELS, tournament.gameType)}</div>
    <div><strong>Partido:</strong> ${formatAlMejorDeDetalle(tournament.settings)}</div>
    <div><strong>Jugadores inscritos:</strong> ${tournament.playerCount || 0}</div>
  `;

  const isDraft = tournament.status === 'draft';
  const isActive = tournament.status === 'active';

  startButton.classList.toggle('d-none', !isDraft);
  finishButton.classList.toggle('d-none', !isActive);
  addPlayersButton.classList.toggle('d-none', !isDraft);
  availablePlayersContainer.closest('.card').classList.toggle('d-none', !isDraft);

  const canGenerate = isActive && matches.length === 0;
  generateMatchesButton.classList.toggle('d-none', !canGenerate);
}

function renderEnrolledPlayers() {
  if (!enrolledPlayers.length) {
    enrolledTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted py-4">Todavía no hay jugadores inscritos</td>
      </tr>
    `;
    return;
  }

  enrolledTableBody.innerHTML = enrolledPlayers.map((entry) => `
    <tr>
      <td>${entry.seed || '-'}</td>
      <td>
        <div class="fw-semibold">${escapeHtml(entry.player?.name || 'Jugador')}</div>
        ${entry.player?.nickname ? `<div class="small text-muted">${escapeHtml(entry.player.nickname)}</div>` : ''}
      </td>
      <td>${entry.player?.rankingPoints ?? 0}</td>
      <td class="text-end">
        ${tournament?.status === 'draft' ? `
          <button type="button" class="btn btn-sm btn-outline-danger" data-remove-id="${entry.playerId}">
            Quitar
          </button>
        ` : '-'}
      </td>
    </tr>
  `).join('');
}

function renderAvailablePlayers() {
  const enrolledIds = new Set(enrolledPlayers.map((entry) => entry.playerId));
  const options = availablePlayers.filter((player) => !enrolledIds.has(player.id));

  if (!options.length) {
    availablePlayersContainer.innerHTML = '<p class="text-muted mb-0">No hay jugadores activos disponibles.</p>';
    return;
  }

  availablePlayersContainer.innerHTML = options.map((player) => `
    <div class="form-check">
      <input class="form-check-input" type="checkbox" value="${player.id}" id="player-${player.id}">
      <label class="form-check-label" for="player-${player.id}">
        ${escapeHtml(player.name)}${player.nickname ? ` (${escapeHtml(player.nickname)})` : ''}
      </label>
    </div>
  `).join('');
}

function renderMatches() {
  if (!matches.length) {
    matchesContainer.innerHTML = `
      <p class="text-muted mb-0">
        ${tournament?.status === 'active'
          ? 'Pulsa "Generar enfrentamientos" para crear los partidos.'
          : 'Los enfrentamientos se generan cuando el torneo esté activo.'}
      </p>
    `;
    matchesSummary.textContent = '0 enfrentamientos';
    return;
  }

  const grouped = matches.reduce((acc, match) => {
    const key = match.groupNumber ? `Grupo ${match.groupNumber}` : `Ronda ${match.round}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(match);
    return acc;
  }, {});

  const alMejorDe = getAlMejorDe(tournament?.settings);
  const legsNecesarios = Math.floor(alMejorDe / 2) + 1;

  matchesContainer.innerHTML = Object.entries(grouped).map(([groupLabel, groupMatches]) => `
    <div class="mb-4">
      <h3 class="h6 mb-3">${escapeHtml(groupLabel)}</h3>
      <div class="vstack gap-3">
        ${groupMatches.map((match) => renderMatchCard(match, legsNecesarios)).join('')}
      </div>
    </div>
  `).join('');

  const finished = matches.filter((match) => ['finished', 'walkover'].includes(match.status)).length;
  matchesSummary.textContent = `${finished}/${matches.length} enfrentamientos cerrados`;
}

function renderMatchCard(match, legsNecesarios) {
  const canRecord = tournament?.status === 'active'
    && ['scheduled', 'in_progress'].includes(match.status)
    && match.player1
    && match.player2;

  return `
    <div class="border rounded p-3 bg-white">
      <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
        <div>
          <strong>${escapeHtml(playerName(match.player1))}</strong>
          <span class="mx-2">vs</span>
          <strong>${escapeHtml(playerName(match.player2))}</strong>
        </div>
        <span class="badge ${MATCH_STATUS_BADGES[match.status] || 'text-bg-secondary'}">
          ${formatLabel(MATCH_STATUS_LABELS, match.status)}
        </span>
      </div>
      <div class="small text-muted mb-3">
        Partidas ganadas: ${match.player1LegsWon} - ${match.player2LegsWon}
        · ${formatAlMejorDeDetalle(tournament.settings)}
      </div>
      ${canRecord ? `
        <div class="d-flex flex-wrap gap-2">
          <button type="button" class="btn btn-sm btn-outline-success" data-leg-winner="${match.id}" data-winner-id="${match.player1Id}">
            Gana ${escapeHtml(match.player1.name)}
          </button>
          <button type="button" class="btn btn-sm btn-outline-success" data-leg-winner="${match.id}" data-winner-id="${match.player2Id}">
            Gana ${escapeHtml(match.player2.name)}
          </button>
        </div>
      ` : ''}
      ${match.winner ? `<div class="small mt-2"><strong>Ganador:</strong> ${escapeHtml(playerName(match.winner))}</div>` : ''}
    </div>
  `;
}

async function loadStandings() {
  try {
    const response = await apiRequest(`/tournaments/${tournamentId}/standings`);
    standingsContainer.innerHTML = renderStandingsBlock(response.data);
  } catch (error) {
    standingsContainer.innerHTML = '<p class="text-muted mb-0">No se pudo cargar la clasificación.</p>';
  }
}

async function loadTournamentData() {
  hideAlert();

  const [tournamentResponse, enrolledResponse, playersResponse, matchesResponse] = await Promise.all([
    apiRequest(`/tournaments/${tournamentId}`),
    apiRequest(`/tournaments/${tournamentId}/players`),
    apiRequest('/players?active=true&limit=100'),
    apiRequest(`/tournaments/${tournamentId}/matches`).catch(() => ({ data: [] })),
  ]);

  tournament = tournamentResponse.data;
  enrolledPlayers = enrolledResponse.data || [];
  availablePlayers = playersResponse.data || [];
  matches = matchesResponse.data || [];

  renderTournamentInfo();
  renderEnrolledPlayers();
  renderAvailablePlayers();
  renderMatches();
  await loadStandings();
}

async function addSelectedPlayers() {
  const selectedIds = [...availablePlayersContainer.querySelectorAll('input[type="checkbox"]:checked')]
    .map((input) => input.value);

  if (!selectedIds.length) {
    showAlert('Selecciona al menos un jugador.', 'warning');
    return;
  }

  try {
    await apiRequest(`/tournaments/${tournamentId}/players`, {
      method: 'POST',
      body: JSON.stringify({ playerIds: selectedIds }),
    });
    showAlert('Jugadores inscritos correctamente.');
    await loadTournamentData();
  } catch (error) {
    showAlert(error.message, 'danger');
  }
}

async function removePlayer(playerId) {
  if (!window.confirm('¿Quitar este jugador del torneo?')) return;

  try {
    await apiRequest(`/tournaments/${tournamentId}/players/${playerId}`, {
      method: 'DELETE',
    });
    showAlert('Jugador quitado del torneo.');
    await loadTournamentData();
  } catch (error) {
    showAlert(error.message, 'danger');
  }
}

async function startTournament() {
  if (!window.confirm('¿Iniciar este torneo? Pasará a estado activo.')) return;

  try {
    await apiRequest(`/tournaments/${tournamentId}/start`, { method: 'POST' });
    showAlert('Torneo iniciado. Ya puedes generar enfrentamientos.');
    await loadTournamentData();
  } catch (error) {
    showAlert(error.message, 'danger');
  }
}

async function generateMatches() {
  if (!window.confirm('¿Generar los enfrentamientos de este torneo?')) return;

  try {
    await apiRequest(`/tournaments/${tournamentId}/generate-matches`, { method: 'POST' });
    showAlert('Enfrentamientos generados correctamente.');
    await loadTournamentData();
  } catch (error) {
    showAlert(error.message, 'danger');
  }
}

async function finishTournament() {
  if (!window.confirm('¿Finalizar este torneo?')) return;

  try {
    await apiRequest(`/tournaments/${tournamentId}/finish`, { method: 'POST' });
    showAlert('Torneo finalizado.');
    await loadTournamentData();
  } catch (error) {
    showAlert(error.message, 'danger');
  }
}

async function recordLeg(matchId, winnerId) {
  try {
    await apiRequest(`/matches/${matchId}/legs`, {
      method: 'POST',
      body: JSON.stringify({ winnerId }),
    });
    showAlert('Partida registrada correctamente.');
    await loadTournamentData();
  } catch (error) {
    showAlert(error.message, 'danger');
  }
}

enrolledTableBody.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-remove-id]');
  if (!button) return;
  await removePlayer(button.dataset.removeId);
});

matchesContainer.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-leg-winner]');
  if (!button) return;

  if (!window.confirm('¿Registrar esta partida a favor del jugador seleccionado?')) return;

  await recordLeg(button.dataset.legWinner, button.dataset.winnerId);
});

addPlayersButton.addEventListener('click', addSelectedPlayers);
startButton.addEventListener('click', startTournament);
generateMatchesButton.addEventListener('click', generateMatches);
finishButton.addEventListener('click', finishTournament);
logoutButton.addEventListener('click', logout);

async function init() {
  if (!tournamentId) {
    showAlert('Torneo no especificado.', 'danger');
    return;
  }

  const data = await requireAuth('admin');
  if (!data) return;

  userNameEl.textContent = data.profile.display_name || data.user.email;

  try {
    await loadTournamentData();
  } catch (error) {
    showAlert(error.message, 'danger');
  }
}

init();
