import { apiRequest } from '../api/client.js';
import { logout } from '../auth/session.js';
import { requireAuth } from '../auth/guard.js';
import { STATUS_LABELS, STATUS_BADGES, formatLabel } from '../utils/tournaments.js';

const userNameEl = document.getElementById('user-name');
const logoutButton = document.getElementById('logout-btn');
const pageAlert = document.getElementById('page-alert');
const tournamentsList = document.getElementById('tournaments-list');
const globalStats = document.getElementById('global-stats');

function showAlert(message, type = 'danger') {
  pageAlert.textContent = message;
  pageAlert.className = `alert alert-${type}`;
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

function renderTournaments(tournaments) {
  if (!tournaments.length) {
    tournamentsList.innerHTML = '<p class="text-muted mb-0">No hay torneos disponibles.</p>';
    return;
  }

  tournamentsList.innerHTML = `
    <div class="list-group list-group-flush">
      ${tournaments.slice(0, 8).map((tournament) => `
        <a href="tournament.html?id=${tournament.id}" class="list-group-item list-group-item-action px-0">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div>
              <div class="fw-semibold">${escapeHtml(tournament.name)}</div>
              <div class="small text-muted">${tournament.playerCount || 0} jugadores</div>
            </div>
            <span class="badge ${STATUS_BADGES[tournament.status] || 'text-bg-secondary'}">
              ${formatLabel(STATUS_LABELS, tournament.status)}
            </span>
          </div>
        </a>
      `).join('')}
    </div>
  `;
}

function renderGlobalStats(stats) {
  if (!stats.length) {
    globalStats.innerHTML = '<p class="text-muted mb-0">Todavía no hay estadísticas.</p>';
    return;
  }

  globalStats.innerHTML = `
    <div class="table-responsive">
      <table class="table table-sm table-hover mb-0 align-middle">
        <thead class="table-light">
          <tr>
            <th>Jugador</th>
            <th>Torneos</th>
            <th>Victorias</th>
            <th>% Victorias</th>
            <th>Puntos ranking</th>
          </tr>
        </thead>
        <tbody>
          ${stats.slice(0, 10).map((entry) => `
            <tr>
              <td>
                <div class="fw-semibold">${escapeHtml(entry.name)}</div>
                ${entry.nickname ? `<div class="small text-muted">${escapeHtml(entry.nickname)}</div>` : ''}
              </td>
              <td>${entry.torneosJugados}</td>
              <td>${entry.enfrentamientosGanados}/${entry.enfrentamientosJugados}</td>
              <td>${entry.porcentajeVictorias}%</td>
              <td>${entry.rankingPoints ?? 0}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function init() {
  const data = await requireAuth();
  if (!data) return;

  if (data.profile?.role === 'admin') {
    window.location.href = '/admin/index.html';
    return;
  }

  userNameEl.textContent = data.profile.display_name || data.user.email;

  try {
    const [tournamentsResponse, statsResponse] = await Promise.all([
      apiRequest('/tournaments?limit=20&status=all'),
      apiRequest('/stats/global'),
    ]);

    renderTournaments(tournamentsResponse.data || []);
    renderGlobalStats(statsResponse.data || []);
  } catch (error) {
    showAlert(error.message);
  }
}

logoutButton.addEventListener('click', logout);
init();
