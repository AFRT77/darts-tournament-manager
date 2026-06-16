import { apiRequest } from '../api/client.js';
import { logout } from '../auth/session.js';
import { requireAuth } from '../auth/guard.js';

const userNameEl = document.getElementById('user-name');
const userRoleEl = document.getElementById('user-role');
const logoutButton = document.getElementById('logout-btn');
const registerForm = document.getElementById('register-form');
const registerAlert = document.getElementById('register-alert');

async function init() {
  const data = await requireAuth('admin');
  if (!data) {
    return;
  }

  userNameEl.textContent = data.profile.display_name || data.user.email;
  userRoleEl.textContent = 'Administrador';
}

function showRegisterMessage(message, type = 'success') {
  registerAlert.textContent = message;
  registerAlert.className = `alert alert-${type}`;
  registerAlert.classList.remove('d-none');
}

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
  } catch (error) {
    showRegisterMessage(error.message, 'danger');
  }
});

init();
