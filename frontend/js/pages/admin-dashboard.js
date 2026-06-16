import { apiRequest } from '../api/client.js';
import { logout } from '../auth/session.js';
import { requireAuth } from '../auth/guard.js';

const userNameEl = document.getElementById('user-name');
const userRoleEl = document.getElementById('user-role');
const logoutButton = document.getElementById('logout-btn');
const registerForm = document.getElementById('register-form');
const registerAlert = document.getElementById('register-alert');
const usersTableBody = document.getElementById('users-table-body');
const usersAlert = document.getElementById('users-alert');
const usersPaginationInfo = document.getElementById('users-pagination-info');
const refreshUsersButton = document.getElementById('refresh-users-btn');
const userModalEl = document.getElementById('user-modal');
const userForm = document.getElementById('user-form');
const editUserIdInput = document.getElementById('edit-user-id');
const editUserEmailInput = document.getElementById('edit-user-email');
const editUserDisplayNameInput = document.getElementById('edit-user-display-name');
const editUserRoleSelect = document.getElementById('edit-user-role');
const saveUserButton = document.getElementById('save-user-btn');

let loadedUsers = [];
let currentUserId = null;

function getUserModal() {
  if (!window.bootstrap?.Modal) return null;
  return window.bootstrap.Modal.getOrCreateInstance(userModalEl);
}

function showUsersAlert(message, type = 'success') {
  usersAlert.textContent = message;
  usersAlert.className = `alert alert-${type}`;
  usersAlert.classList.remove('d-none');
}

function hideUsersAlert() {
  usersAlert.classList.add('d-none');
}

function showRegisterMessage(message, type = 'success') {
  registerAlert.textContent = message;
  registerAlert.className = `alert alert-${type}`;
  registerAlert.classList.remove('d-none');
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('es-ES');
}

function renderUsers(users) {
  loadedUsers = users;

  if (!users.length) {
    usersTableBody.innerHTML = `
      <tr><td colspan="4" class="text-center text-muted py-4">No hay usuarios</td></tr>
    `;
    return;
  }

  usersTableBody.innerHTML = users.map((user) => `
    <tr>
      <td>
        <div class="fw-semibold">${escapeHtml(user.displayName || user.email)}</div>
        <div class="small text-muted">${escapeHtml(user.email)}</div>
      </td>
      <td><span class="badge ${user.role === 'admin' ? 'text-bg-primary' : 'text-bg-secondary'}">${user.role === 'admin' ? 'Admin' : 'Usuario'}</span></td>
      <td>${formatDate(user.createdAt)}</td>
      <td class="text-end">
        <button type="button" class="btn btn-sm btn-outline-primary me-1" data-action="edit" data-id="${user.id}">Editar</button>
        ${user.id !== currentUserId ? `
          <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${user.id}">Eliminar</button>
        ` : '<span class="small text-muted">Tú</span>'}
      </td>
    </tr>
  `).join('');
}

async function loadUsers() {
  hideUsersAlert();

  try {
    const response = await apiRequest('/users?limit=100');
    renderUsers(response.data || []);
    const meta = response.meta || { total: response.data?.length || 0 };
    usersPaginationInfo.textContent = `${meta.total || 0} usuarios`;
  } catch (error) {
    usersTableBody.innerHTML = `
      <tr><td colspan="4" class="text-center text-muted py-4">No se pudieron cargar los usuarios</td></tr>
    `;
    showUsersAlert(error.message, 'danger');
  }
}

function openEditUserModal(user) {
  const modal = getUserModal();
  if (!modal) {
    showUsersAlert('No se pudo abrir el editor. Recarga la página.', 'danger');
    return;
  }

  editUserIdInput.value = user.id;
  editUserEmailInput.value = user.email;
  editUserDisplayNameInput.value = user.displayName || '';
  editUserRoleSelect.value = user.role || 'user';
  modal.show();
}

async function saveUser(event) {
  event.preventDefault();
  hideUsersAlert();

  const userId = editUserIdInput.value;
  const payload = {
    displayName: editUserDisplayNameInput.value.trim(),
    role: editUserRoleSelect.value,
  };

  saveUserButton.disabled = true;

  try {
    await apiRequest(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    getUserModal()?.hide();
    showUsersAlert('Usuario actualizado correctamente.');
    await loadUsers();
  } catch (error) {
    showUsersAlert(error.message, 'danger');
  } finally {
    saveUserButton.disabled = false;
  }
}

async function deleteUser(id) {
  if (!window.confirm('¿Eliminar este usuario de forma permanente?')) return;

  try {
    await apiRequest(`/users/${id}`, { method: 'DELETE' });
    showUsersAlert('Usuario eliminado correctamente.');
    await loadUsers();
  } catch (error) {
    showUsersAlert(error.message, 'danger');
  }
}

usersTableBody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === 'delete') {
    await deleteUser(id);
    return;
  }

  if (action === 'edit') {
    const user = loadedUsers.find((entry) => entry.id === id);
    if (user) openEditUserModal(user);
  }
});

refreshUsersButton.addEventListener('click', loadUsers);
userForm.addEventListener('submit', saveUser);
logoutButton.addEventListener('click', logout);

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(registerForm);
  const payload = {
    email: formData.get('email'),
    password: formData.get('password'),
    displayName: formData.get('displayName') || undefined,
    role: formData.get('role'),
  };

  try {
    await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    showRegisterMessage('Usuario registrado correctamente.');
    registerForm.reset();
    await loadUsers();
  } catch (error) {
    showRegisterMessage(error.message, 'danger');
  }
});

async function init() {
  const data = await requireAuth('admin');
  if (!data) return;

  currentUserId = data.profile.id;
  userNameEl.textContent = data.profile.display_name || data.user.email;
  userRoleEl.textContent = 'Administrador';
  await loadUsers();
}

init();
