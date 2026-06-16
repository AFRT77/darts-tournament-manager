import { login } from '../auth/session.js';
import { redirectByRole, redirectIfAuthenticated } from '../auth/guard.js';

redirectIfAuthenticated();

const form = document.getElementById('login-form');
const alertBox = document.getElementById('login-alert');
const submitButton = document.getElementById('login-submit');

function showError(message) {
  alertBox.textContent = message;
  alertBox.classList.remove('d-none');
}

function hideError() {
  alertBox.classList.add('d-none');
  alertBox.textContent = '';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideError();

  const email = form.email.value.trim();
  const password = form.password.value;
  submitButton.disabled = true;
  submitButton.textContent = 'Entrando...';

  try {
    const data = await login(email, password);
    redirectByRole(data.profile?.role || 'user');
  } catch (error) {
    showError(error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Entrar';
  }
});
