import { apiRequest } from '../api/client.js';
import { logout } from '../auth/session.js';
import { requireAuth } from '../auth/guard.js';
import { debounce } from '../utils/debounce.js';

const userNameEl = document.getElementById('user-name');
const logoutButton = document.getElementById('logout-btn');
const playersTableBody = document.getElementById('players-table-body');
const playersAlert = document.getElementById('players-alert');
const searchInput = document.getElementById('search-input');
const activeFilter = document.getElementById('active-filter');
const refreshButton = document.getElementById('refresh-btn');
const playerForm = document.getElementById('player-form');
const playerModalEl = document.getElementById('player-modal');
const playerModalTitle = document.getElementById('player-modal-title');
const playerIdInput = document.getElementById('player-id');
const nameInput = document.getElementById('player-name');
const nicknameInput = document.getElementById('player-nickname');
const pointsInput = document.getElementById('player-points');
const activeInput = document.getElementById('player-active');
const activeField = document.getElementById('active-field');
const savePlayerButton = document.getElementById('save-player-btn');
const paginationInfo = document.getElementById('pagination-info');

let currentPage = 1;
const pageSize = 20;
let loadedPlayers = [];

function getPlayerModal() {
  if (!window.bootstrap?.Modal) {
    return null;
  }

  return window.bootstrap.Modal.getOrCreateInstance(playerModalEl);
}

function showAlert(message, type = 'success') {
  playersAlert.textContent = message;
  playersAlert.className = `alert alert-${type}`;
  playersAlert.classList.remove('d-none');
}

function hideAlert() {
  playersAlert.classList.add('d-none');
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('es-ES');
}

function setLoading(message = 'Cargando...') {
  playersTableBody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center text-muted py-4">${message}</td>
    </tr>
  `;
}

function renderPlayers(players) {
  if (!Array.isArray(players) || !players.length) {
    playersTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted py-4">No hay jugadores para mostrar</td>
      </tr>
    `;
    return;
  }

  playersTableBody.innerHTML = players.map((player) => `
    <tr>
      <td>
        <div class="fw-semibold">${escapeHtml(player.name)}</div>
        ${player.nickname ? `<div class="small text-muted">${escapeHtml(player.nickname)}</div>` : ''}
      </td>
      <td>${player.rankingPoints ?? 0}</td>
      <td>
        <span class="badge ${player.active ? 'text-bg-success' : 'text-bg-secondary'}">
          ${player.active ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td>${formatDate(player.createdAt)}</td>
      <td class="text-end">
        <button type="button" class="btn btn-sm btn-outline-primary me-1" data-action="edit" data-id="${player.id}">
          Editar
        </button>
        ${player.active ? `
          <button type="button" class="btn btn-sm btn-outline-warning me-1" data-action="deactivate" data-id="${player.id}">
            Desactivar
          </button>
          <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete-permanent" data-id="${player.id}">
            Eliminar
          </button>
        ` : `
          <button type="button" class="btn btn-sm btn-outline-success me-1" data-action="activate" data-id="${player.id}">
            Activar
          </button>
          <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete-permanent" data-id="${player.id}">
            Eliminar
          </button>
        `}
      </td>
    </tr>
  `).join('');

  loadedPlayers = players;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function loadPlayers() {
  hideAlert();
  setLoading();

  const params = new URLSearchParams({
    page: String(currentPage),
    limit: String(pageSize),
    active: activeFilter.value,
  });

  const search = searchInput.value.trim();
  if (search) {
    params.set('search', search);
  }

  try {
    const response = await apiRequest(`/players?${params.toString()}`);
    const players = response.data || [];
    const meta = response.meta || { page: 1, totalPages: 1, total: 0 };

    renderPlayers(players);

    const totalPages = meta.totalPages > 0 ? meta.totalPages : 1;
    paginationInfo.textContent = `Página ${meta.page || 1} de ${totalPages} · ${meta.total || 0} jugadores`;
  } catch (error) {
    setLoading('No se pudieron cargar los jugadores');
    showAlert(error.message, 'danger');
  }
}

function openCreateModal() {
  const playerModal = getPlayerModal();
  if (!playerModal) {
    showAlert('No se pudo abrir el formulario. Recarga la página.', 'danger');
    return;
  }

  playerForm.reset();
  playerIdInput.value = '';
  activeField.classList.add('d-none');
  activeInput.checked = true;
  playerModalTitle.textContent = 'Nuevo jugador';
  savePlayerButton.textContent = 'Crear jugador';
  playerModal.show();
}

function openEditModal(player) {
  const playerModal = getPlayerModal();
  if (!playerModal) {
    showAlert('No se pudo abrir el formulario. Recarga la página.', 'danger');
    return;
  }

  playerForm.reset();
  playerIdInput.value = player.id;
  nameInput.value = player.name || '';
  nicknameInput.value = player.nickname || '';
  pointsInput.value = player.rankingPoints ?? 0;
  activeInput.checked = Boolean(player.active);
  activeField.classList.remove('d-none');
  playerModalTitle.textContent = 'Editar jugador';
  savePlayerButton.textContent = 'Guardar cambios';
  playerModal.show();
}

async function handleSavePlayer(event) {
  event.preventDefault();
  hideAlert();

  const playerId = playerIdInput.value.trim();
  const payload = {
    name: nameInput.value.trim(),
    nickname: nicknameInput.value.trim() || null,
    rankingPoints: Number(pointsInput.value || 0),
  };

  if (payload.name.length < 2) {
    showAlert('El nombre debe tener al menos 2 caracteres.', 'danger');
    return;
  }

  savePlayerButton.disabled = true;

  try {
    if (playerId) {
      payload.active = activeInput.checked;
      await apiRequest(`/players/${playerId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      showAlert('Jugador actualizado correctamente.');
    } else {
      await apiRequest('/players', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      showAlert('Jugador creado correctamente.');
    }

    const playerModal = getPlayerModal();
    playerModal?.hide();
    await loadPlayers();
  } catch (error) {
    showAlert(error.message, 'danger');
  } finally {
    savePlayerButton.disabled = false;
  }
}

async function deactivatePlayer(id) {
  if (!window.confirm('¿Desactivar este jugador?')) {
    return;
  }

  try {
    await apiRequest(`/players/${id}`, { method: 'DELETE' });
    showAlert('Jugador desactivado.');
    await loadPlayers();
  } catch (error) {
    showAlert(error.message, 'danger');
  }
}

async function activatePlayer(id) {
  try {
    await apiRequest(`/players/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ active: true }),
    });
    showAlert('Jugador activado.');
    await loadPlayers();
  } catch (error) {
    showAlert(error.message, 'danger');
  }
}

async function deletePlayerPermanent(id) {
  if (!window.confirm('¿Eliminar este jugador de forma permanente? Esta acción no se puede deshacer.')) {
    return;
  }

  try {
    await apiRequest(`/players/${id}/permanent`, { method: 'DELETE' });
    showAlert('Jugador eliminado permanentemente.');
    await loadPlayers();
  } catch (error) {
    showAlert(error.message, 'danger');
  }
}

playersTableBody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === 'deactivate') {
    await deactivatePlayer(id);
    return;
  }

  if (action === 'activate') {
    await activatePlayer(id);
    return;
  }

  if (action === 'delete-permanent') {
    await deletePlayerPermanent(id);
    return;
  }

  if (action === 'edit') {
    const player = loadedPlayers.find((entry) => entry.id === id);
    if (player) {
      openEditModal(player);
      return;
    }

    try {
      const response = await apiRequest(`/players/${id}`);
      openEditModal(response.data);
    } catch (error) {
      showAlert(error.message, 'danger');
    }
  }
});

playerModalEl.addEventListener('hidden.bs.modal', () => {
  activeField.classList.add('d-none');
});

searchInput.addEventListener('input', debounce(() => {
  currentPage = 1;
  loadPlayers();
}, 350));

activeFilter.addEventListener('change', () => {
  currentPage = 1;
  loadPlayers();
});

refreshButton.addEventListener('click', loadPlayers);
document.getElementById('new-player-btn').addEventListener('click', openCreateModal);
playerForm.addEventListener('submit', handleSavePlayer);
logoutButton.addEventListener('click', logout);

async function init() {
  const data = await requireAuth('admin');
  if (!data) return;

  userNameEl.textContent = data.profile.display_name || data.user.email;
  await loadPlayers();
}

init();
