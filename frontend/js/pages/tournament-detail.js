import { apiRequest } from '../api/client.js';
import { logout } from '../auth/session.js';
import { requireAuth } from '../auth/guard.js';
import { renderStandingsBlock } from '../utils/standings.js';
import {
  getKnockoutMatches,
  getGroupMatches,
  renderMatchesView,
  shouldUseBracketView,
} from '../utils/bracket.js';
import {
  FORMAT_LABELS,
  GAME_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_BADGES,
  formatLabel,
  formatAlMejorDeDetalleForMatch,
  formatTournamentMatchFormats,
  getAlMejorDeForMatch,
  partidasParaGanar,
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
const generateKnockoutButton = document.getElementById('generate-knockout-btn');
const deleteTournamentButton = document.getElementById('delete-tournament-btn');
const addPlayersButton = document.getElementById('add-players-btn');
const matchesContainer = document.getElementById('matches-container');
const matchesSummary = document.getElementById('matches-summary');
const matchesCard = document.getElementById('matches-card');
const standingsContainer = document.getElementById('standings-container');
const qualifiersCard = document.getElementById('qualifiers-card');
const qualifiersContainer = document.getElementById('qualifiers-container');
const saveQualifiersButton = document.getElementById('save-qualifiers-btn');
const editResultModalEl = document.getElementById('edit-result-modal');
const editResultForm = document.getElementById('edit-result-form');
const editResultMatchIdInput = document.getElementById('edit-result-match-id');
const editPlayer1Label = document.getElementById('edit-player1-label');
const editPlayer2Label = document.getElementById('edit-player2-label');
const editPlayer1LegsInput = document.getElementById('edit-player1-legs');
const editPlayer2LegsInput = document.getElementById('edit-player2-legs');
const editResultHelp = document.getElementById('edit-result-help');
const saveResultButton = document.getElementById('save-result-btn');

let tournament = null;
let enrolledPlayers = [];
let availablePlayers = [];
let matches = [];
let qualifiersPreview = null;

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

function isMatchFinished(match) {
  return ['finished', 'walkover'].includes(match.status);
}

function getEditResultModal() {
  if (!window.bootstrap?.Modal) return null;
  return window.bootstrap.Modal.getOrCreateInstance(editResultModalEl);
}

function renderTournamentInfo() {
  if (!tournament) return;

  tournamentTitle.textContent = tournament.name;
  tournamentStatusBadge.className = `badge ${STATUS_BADGES[tournament.status] || 'text-bg-secondary'}`;
  tournamentStatusBadge.textContent = formatLabel(STATUS_LABELS, tournament.status);

  const groupMatches = getGroupMatches(matches);
  const knockoutMatches = getKnockoutMatches(matches);
  const groupStageComplete = groupMatches.length > 0 && groupMatches.every(isMatchFinished);
  const allFinished = matches.length > 0 && matches.every(isMatchFinished);
  const qualifiersPerGroup = tournament.settings?.qualifiersPerGroup || 2;

  tournamentMeta.innerHTML = `
    <div><strong>Formato:</strong> ${formatLabel(FORMAT_LABELS, tournament.format)}</div>
    <div><strong>Juego:</strong> ${formatLabel(GAME_TYPE_LABELS, tournament.gameType)}</div>
    <div><strong>Partido:</strong> ${formatTournamentMatchFormats(tournament.settings, tournament.format)}</div>
    <div><strong>Jugadores inscritos:</strong> ${tournament.playerCount || 0}</div>
    ${tournament.format === 'groups_knockout' ? `
      <div><strong>Grupos:</strong> ${tournament.settings?.groupCount || 2} · <strong>Clasificados/grupo:</strong> ${qualifiersPerGroup}</div>
    ` : ''}
  `;

  const isDraft = tournament.status === 'draft';
  const isActive = tournament.status === 'active';

  startButton.classList.toggle('d-none', !isDraft);
  finishButton.classList.toggle('d-none', !isActive || !allFinished || (tournament.format === 'groups_knockout' && !knockoutMatches.length));
  addPlayersButton.classList.toggle('d-none', !isDraft);
  availablePlayersContainer.closest('.card').classList.toggle('d-none', !isDraft);
  deleteTournamentButton.classList.remove('d-none');

  const canGenerateGroups = isActive && matches.length === 0;
  generateMatchesButton.classList.toggle('d-none', !canGenerateGroups);
  generateMatchesButton.textContent = tournament.format === 'groups_knockout'
    ? 'Generar fase de grupos'
    : 'Generar enfrentamientos';

  const canGenerateKnockout = isActive
    && tournament.format === 'groups_knockout'
    && groupStageComplete
    && knockoutMatches.length === 0;
  generateKnockoutButton.classList.toggle('d-none', !canGenerateKnockout);

  qualifiersCard.classList.toggle('d-none', tournament.format !== 'groups_knockout' || !groupStageComplete || knockoutMatches.length > 0);
}

function renderEnrolledPlayers() {
  if (!enrolledPlayers.length) {
    enrolledTableBody.innerHTML = `
      <tr><td colspan="4" class="text-center text-muted py-4">Todavía no hay jugadores inscritos</td></tr>
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
          <button type="button" class="btn btn-sm btn-outline-danger" data-remove-id="${entry.playerId}">Quitar</button>
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
  const emptyMessage = `
    <p class="text-muted mb-0">
      ${tournament?.status === 'active'
        ? (tournament?.format === 'groups_knockout'
          ? 'Pulsa "Generar fase de grupos" para crear los partidos de la primera fase.'
          : 'Pulsa "Generar enfrentamientos" para crear los partidos.')
        : 'Los enfrentamientos se generan cuando el torneo esté activo.'}
    </p>
  `;

  if (!matches.length) {
    matchesContainer.innerHTML = emptyMessage;
    matchesSummary.textContent = '0 enfrentamientos';
    matchesCard?.classList.remove('matches-card--bracket');
    return;
  }

  const useBracket = shouldUseBracketView(tournament, matches);
  matchesCard?.classList.toggle('matches-card--bracket', useBracket);

  matchesContainer.innerHTML = renderMatchesView(matches, tournament, {
    interactive: true,
    emptyMessage,
  });

  const finished = matches.filter(isMatchFinished).length;
  matchesSummary.textContent = `${finished}/${matches.length} enfrentamientos cerrados`;
}

async function loadQualifiersEditor() {
  if (!tournament || tournament.format !== 'groups_knockout') {
    qualifiersCard.classList.add('d-none');
    return;
  }

  const groupMatches = getGroupMatches(matches);
  const knockoutMatches = getKnockoutMatches(matches);
  const groupStageComplete = groupMatches.length > 0 && groupMatches.every(isMatchFinished);

  if (!groupStageComplete || knockoutMatches.length > 0) {
    qualifiersCard.classList.add('d-none');
    return;
  }

  qualifiersCard.classList.remove('d-none');

  try {
    const [standingsResponse, qualifiersResponse] = await Promise.all([
      apiRequest(`/tournaments/${tournamentId}/standings`),
      apiRequest(`/tournaments/${tournamentId}/knockout-qualifiers`),
    ]);

    qualifiersPreview = {
      groups: standingsResponse.data?.groups || [],
      saved: qualifiersResponse.data?.qualifiers || null,
      qualifiersPerGroup: qualifiersResponse.data?.qualifiersPerGroup || tournament.settings?.qualifiersPerGroup || 2,
    };

    qualifiersContainer.innerHTML = qualifiersPreview.groups.map((group) => {
      const savedGroup = qualifiersPreview.saved?.find((entry) => entry.groupNumber === group.groupNumber);
      const selectedIds = new Set(savedGroup?.playerIds || group.standings.slice(0, qualifiersPreview.qualifiersPerGroup).map((entry) => entry.playerId));

      return `
        <div class="mb-4">
          <h3 class="h6">Grupo ${group.groupNumber}</h3>
          <div class="vstack gap-2">
            ${group.standings.map((entry) => `
              <div class="form-check">
                <input class="form-check-input" type="checkbox" value="${entry.playerId}" id="qualifier-${group.groupNumber}-${entry.playerId}" data-group="${group.groupNumber}" ${selectedIds.has(entry.playerId) ? 'checked' : ''}>
                <label class="form-check-label" for="qualifier-${group.groupNumber}-${entry.playerId}">
                  ${escapeHtml(playerName(entry.player))} · ${entry.points} pts
                </label>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    qualifiersContainer.innerHTML = `<p class="text-muted mb-0">${escapeHtml(error.message)}</p>`;
  }
}

function collectSelectedQualifiers() {
  const grouped = {};

  qualifiersContainer.querySelectorAll('input[type="checkbox"]:checked').forEach((input) => {
    const groupNumber = Number(input.dataset.group);
    if (!grouped[groupNumber]) grouped[groupNumber] = [];
    grouped[groupNumber].push(input.value);
  });

  return Object.entries(grouped).map(([groupNumber, playerIds]) => ({
    groupNumber: Number(groupNumber),
    playerIds,
  }));
}

async function saveQualifiers() {
  try {
    const qualifiers = collectSelectedQualifiers();
    if (qualifiers.length !== qualifiersPreview.groups.length) {
      throw new Error('Debes configurar todos los grupos');
    }

    await apiRequest(`/tournaments/${tournamentId}/knockout-qualifiers`, {
      method: 'PUT',
      body: JSON.stringify({ qualifiers }),
    });

    showAlert('Clasificados guardados correctamente.');
    await loadTournamentData();
  } catch (error) {
    showAlert(error.message, 'danger');
  }
}

function openEditResultModal(matchId) {
  const match = matches.find((entry) => entry.id === matchId);
  if (!match) return;

  const modal = getEditResultModal();
  if (!modal) {
    showAlert('No se pudo abrir el editor de resultados.', 'danger');
    return;
  }

  const alMejorDe = getAlMejorDeForMatch(tournament.settings, match, tournament.format);
  const legsNecesarios = partidasParaGanar(alMejorDe);

  editResultMatchIdInput.value = match.id;
  editPlayer1Label.textContent = match.player1.name;
  editPlayer2Label.textContent = match.player2.name;
  editPlayer1LegsInput.value = match.player1LegsWon;
  editPlayer2LegsInput.value = match.player2LegsWon;
  editPlayer1LegsInput.max = alMejorDe;
  editPlayer2LegsInput.max = alMejorDe;
  editResultHelp.textContent = `${formatAlMejorDeDetalleForMatch(tournament.settings, match, tournament.format)}. Gana quien llegue a ${legsNecesarios} partidas.`;

  modal.show();
}

async function saveEditedResult(event) {
  event.preventDefault();

  saveResultButton.disabled = true;

  try {
    await apiRequest(`/matches/${editResultMatchIdInput.value}/result`, {
      method: 'PATCH',
      body: JSON.stringify({
        player1LegsWon: Number(editPlayer1LegsInput.value),
        player2LegsWon: Number(editPlayer2LegsInput.value),
      }),
    });

    getEditResultModal()?.hide();
    showAlert('Resultado actualizado correctamente.');
    await loadTournamentData();
  } catch (error) {
    showAlert(error.message, 'danger');
  } finally {
    saveResultButton.disabled = false;
  }
}

async function resetMatchById(matchId) {
  if (!window.confirm('¿Rehacer este partido? Se borrará el resultado y, si es eliminatoria, se limpiará la ronda siguiente.')) {
    return;
  }

  try {
    await apiRequest(`/matches/${matchId}/reset`, { method: 'POST' });
    showAlert('Partido rehecho correctamente.');
    await loadTournamentData();
  } catch (error) {
    showAlert(error.message, 'danger');
  }
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
  await loadQualifiersEditor();
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
    await apiRequest(`/tournaments/${tournamentId}/players/${playerId}`, { method: 'DELETE' });
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
    showAlert('Torneo iniciado.');
    await loadTournamentData();
  } catch (error) {
    showAlert(error.message, 'danger');
  }
}

async function generateMatches() {
  const label = tournament.format === 'groups_knockout' ? 'fase de grupos' : 'enfrentamientos';
  if (!window.confirm(`¿Generar la ${label} de este torneo?`)) return;

  try {
    await apiRequest(`/tournaments/${tournamentId}/generate-matches`, { method: 'POST' });
    showAlert('Enfrentamientos generados correctamente.');
    await loadTournamentData();
  } catch (error) {
    showAlert(error.message, 'danger');
  }
}

async function generateKnockout() {
  if (!window.confirm('¿Generar la fase eliminatoria con los clasificados actuales?')) return;

  try {
    await apiRequest(`/tournaments/${tournamentId}/generate-knockout`, { method: 'POST' });
    showAlert('Eliminatoria generada correctamente.');
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

async function deleteTournament() {
  if (!window.confirm('¿Eliminar este torneo de forma permanente? Se borrarán inscripciones, enfrentamientos y resultados.')) {
    return;
  }

  try {
    await apiRequest(`/tournaments/${tournamentId}`, { method: 'DELETE' });
    window.location.href = 'tournaments.html';
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
  const legButton = event.target.closest('[data-leg-winner]');
  if (legButton) {
    if (!window.confirm('¿Registrar esta partida a favor del jugador seleccionado?')) return;
    await recordLeg(legButton.dataset.legWinner, legButton.dataset.winnerId);
    return;
  }

  const editButton = event.target.closest('[data-edit-result]');
  if (editButton) {
    openEditResultModal(editButton.dataset.editResult);
    return;
  }

  const resetButton = event.target.closest('[data-reset-match]');
  if (resetButton) {
    await resetMatchById(resetButton.dataset.resetMatch);
  }
});

addPlayersButton.addEventListener('click', addSelectedPlayers);
startButton.addEventListener('click', startTournament);
generateMatchesButton.addEventListener('click', generateMatches);
generateKnockoutButton.addEventListener('click', generateKnockout);
finishButton.addEventListener('click', finishTournament);
deleteTournamentButton.addEventListener('click', deleteTournament);
saveQualifiersButton.addEventListener('click', saveQualifiers);
editResultForm.addEventListener('submit', saveEditedResult);
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
