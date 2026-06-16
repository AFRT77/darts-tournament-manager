import { API_BASE_URL } from '../config.js';
import { getApiErrorMessage } from '../utils/errors.js';
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  refreshSession,
} from '../auth/session.js';

export async function apiRequest(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor. ¿Está arrancado con npm run dev?');
  }

  if (response.status === 401 && getRefreshToken()) {
    try {
      await refreshSession();
      headers.Authorization = `Bearer ${getAccessToken()}`;
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
      });
    } catch {
      clearSession();
      window.location.href = '/login.html';
      throw new Error('Sesión expirada');
    }
  }

  let body;

  try {
    body = await response.json();
  } catch {
    throw new Error('Respuesta inválida del servidor');
  }

  if (!response.ok || !body.success) {
    throw new Error(getApiErrorMessage(body));
  }

  return body;
}