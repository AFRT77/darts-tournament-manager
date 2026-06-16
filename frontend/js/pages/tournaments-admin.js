import { apiRequest } from '../api/client.js';
import { logout } from '../auth/session.js';
import { requireAuth } from '../auth/guard.js';
import { debounce } from '../utils/debounce.js';
import {
  FORMAT_LABELS,
  GAME_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_BADGES,
  formatLabel,
  formatAlMejorDeAyuda,
  formatTournamentMatchFormats,
} from '../utils/tournaments.js';

const userNameEl = document.getElementById('user-name');
const logoutButton = document.getElementById('logout-btn');
const tournamentsTableBody = document.getElementById('tournaments-table-body');
const tournamentsAlert = document.getElementById('tournaments-alert');
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const refreshButton = document.getElementById('refresh-btn');
const tournamentForm = document.getElementById('tournament-form');
const tournamentModalEl = document.getElementById('tournament-modal');
const saveTournamentButton = document.getElementById('save-tournament-btn');
const paginationInfo = document.getElementById('pagination-info');
const alMejorDeHelp = document.getElementById('al-mejor-de-help');
const alMejorDeSelect = document.getElementById('tournament-al-mejor-de');
const alMejorDeLabel = document.getElementById('al-mejor-de-label');
const knockoutAlMejorDeField = document.getElementById('knockout-al-mejor-de-field');
const knockoutAlMejorDeHelp = document.getElementById('knockout-al-mejor-de-help');
const knockoutAlMejorDeSelect = document.getElementById('tournament-knockout-al-mejor-de');
const formatSelect = document.getElementById('tournament-format');

let currentPage = 1;
const pageSize = 20;

function getTournamentModal() {
  if (!window.bootstrap?.Modal) return null;
  return window.bootstrap.Modal.getOrCreateInstance(tournamentModalEl);
}

function showAlert(message, type = 'success') {
  tournamentsAlert.textContent = message;
  tournamentsAlert.className = `alert alert-${type}`;
  tournamentsAlert.classList.remove('d-none');
}

function hideAlert() {
  tournamentsAlert.classList.add('d-none');
}

function setLoading(message = 'Cargando...') {
  tournamentsTableBody.innerHTML = `
    <tr>
      <td colspan="6" class="text-center text-muted py-4">${message}</td>
    </tr>
  `;
}

function renderTournaments(tournaments) {
  if (!Array.isArray(tournaments) || !tournaments.length) {
    tournamentsTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted py-4">No hay torneos para mostrar</td>
      </tr>
    `;
    return;
  }

  tournamentsTableBody.innerHTML = tournaments.map((tournament) => `
    <tr>
      <td>
        <div class="fw-semibold">${escapeHtml(tournament.name)}</div>
        <div class="small text-muted">${formatTournamentMatchFormats(tournament.settings, tournament.format)}</div>
      </td>
      <td>${formatLabel(FORMAT_LABELS, tournament.format)}</td>
      <td>${formatLabel(GAME_TYPE_LABELS, tournament.gameType)}</td>
      <td>
        <span class="badge ${STATUS_BADGES[tournament.status] || 'text-bg-secondary'}">
          ${formatLabel(STATUS_LABELS, tournament.status)}
        </span>
      </td>
      <td>${tournament.playerCount || 0}</td>
      <td class="text-end">
        <a class="btn btn-sm btn-outline-primary me-1" href="tournament-detail.html?id=${tournament.id}">
          Gestionar
        </a>
        <button type="button" class="btn btn-sm btn-outline-danger" data-delete-id="${tournament.id}">
          Eliminar
        </button>
      </td>
    </tr>
  `).join('');
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function loadTournaments() {
  hideAlert();
  setLoading();

  const params = new URLSearchParams({
    page: String(currentPage),
    limit: String(pageSize),
    status: statusFilter.value,
  });

  const search = searchInput.value.trim();
  if (search) params.set('search', search);

  try {
    const response = await apiRequest(`/tournaments?${params.toString()}`);
    renderTournaments(response.data || []);
    const meta = response.meta || { page: 1, totalPages: 1, total: 0 };
    const totalPages = meta.totalPages > 0 ? meta.totalPages : 1;
    paginationInfo.textContent = `Página ${meta.page || 1} de ${totalPages} · ${meta.total || 0} torneos`;
  } catch (error) {
    setLoading('No se pudieron cargar los torneos');
    showAlert(error.message, 'danger');
  }
}

function openCreateModal() {
  const modal = getTournamentModal();
  if (!modal) {
    showAlert('No se pudo abrir el formulario. Recarga la página.', 'danger');
    return;
  }

  tournamentForm.reset();
  updateFormatFields();
  modal.show();
}

async function handleCreateTournament(event) {
  event.preventDefault();
  hideAlert();

  const formData = new FormData(tournamentForm);
  const payload = {
    name: formData.get('name').trim(),
    format: formData.get('format'),
    gameType: formData.get('gameType'),
    settings: {
      alMejorDe: Number(formData.get('alMejorDe') || 3),
    },
  };

  if (formData.get('format') === 'groups_knockout') {
    payload.settings.groupCount = Number(formData.get('groupCount') || 2);
    payload.settings.qualifiersPerGroup = Number(formData.get('qualifiersPerGroup') || 2);
    payload.settings.knockoutAlMejorDe = Number(formData.get('knockoutAlMejorDe') || 1);
  }

  saveTournamentButton.disabled = true;

  try {
    const response = await apiRequest('/tournaments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    getTournamentModal()?.hide();
    showAlert('Torneo creado correctamente.');
    window.location.href = `tournament-detail.html?id=${response.data.id}`;
  } catch (error) {
    showAlert(error.message, 'danger');
  } finally {
    saveTournamentButton.disabled = false;
  }
}

function updateFormatFields() {
  const isGroupsKnockout = formatSelect?.value === 'groups_knockout';

  document.getElementById('group-count-field')?.classList.toggle('d-none', !isGroupsKnockout);
  document.getElementById('qualifiers-field')?.classList.toggle('d-none', !isGroupsKnockout);
  knockoutAlMejorDeField?.classList.toggle('d-none', !isGroupsKnockout);

  if (alMejorDeLabel) {
    alMejorDeLabel.textContent = isGroupsKnockout ? 'Fase de grupos · al mejor de' : 'Al mejor de';
  }

  updateAlMejorDeHelp();
  updateKnockoutAlMejorDeHelp();
}

function updateAlMejorDeHelp() {
  if (!alMejorDeHelp || !alMejorDeSelect) return;
  alMejorDeHelp.textContent = formatAlMejorDeAyuda(Number(alMejorDeSelect.value || 3));
}

function updateKnockoutAlMejorDeHelp() {
  if (!knockoutAlMejorDeHelp || !knockoutAlMejorDeSelect) return;
  knockoutAlMejorDeHelp.textContent = formatAlMejorDeAyuda(Number(knockoutAlMejorDeSelect.value || 1));
}

formatSelect?.addEventListener('change', updateFormatFields);

if (alMejorDeSelect) {
  alMejorDeSelect.addEventListener('change', updateAlMejorDeHelp);
}

if (knockoutAlMejorDeSelect) {
  knockoutAlMejorDeSelect.addEventListener('change', updateKnockoutAlMejorDeHelp);
}

updateFormatFields();

searchInput.addEventListener('input', debounce(() => {
  currentPage = 1;
  loadTournaments();
}, 350));

statusFilter.addEventListener('change', () => {
  currentPage = 1;
  loadTournaments();
});

refreshButton.addEventListener('click', loadTournaments);
document.getElementById('new-tournament-btn').addEventListener('click', openCreateModal);
tournamentForm.addEventListener('submit', handleCreateTournament);
tournamentsTableBody.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-delete-id]');
  if (!button) return;

  if (!window.confirm('¿Eliminar este torneo de forma permanente? Se borrarán inscripciones, enfrentamientos y resultados.')) {
    return;
  }

  try {
    await apiRequest(`/tournaments/${button.dataset.deleteId}`, { method: 'DELETE' });
    showAlert('Torneo eliminado correctamente.');
    await loadTournaments();
  } catch (error) {
    showAlert(error.message, 'danger');
  }
});
logoutButton.addEventListener('click', logout);

async function init() {
  const data = await requireAuth('admin');
  if (!data) return;

  userNameEl.textContent = data.profile.display_name || data.user.email;
  await loadTournaments();
}

init();
