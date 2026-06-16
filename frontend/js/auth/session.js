import { API_BASE_URL } from '../config.js';

const STORAGE_KEYS = {
  accessToken: 'dtm_access_token',
  refreshToken: 'dtm_refresh_token',
  expiresAt: 'dtm_expires_at',
  profile: 'dtm_profile',
};

export function getAccessToken() {
  return localStorage.getItem(STORAGE_KEYS.accessToken);
}

export function getRefreshToken() {
  return localStorage.getItem(STORAGE_KEYS.refreshToken);
}

export function getProfile() {
  const raw = localStorage.getItem(STORAGE_KEYS.profile);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSession({ session, profile }) {
  localStorage.setItem(STORAGE_KEYS.accessToken, session.accessToken);
  localStorage.setItem(STORAGE_KEYS.refreshToken, session.refreshToken);
  localStorage.setItem(STORAGE_KEYS.expiresAt, String(session.expiresAt || ''));
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
}

export function clearSession() {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
}

export async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const body = await response.json();

  if (!response.ok || !body.success) {
    throw new Error(body.error?.message || 'No se pudo iniciar sesión');
  }

  saveSession(body.data);
  return body.data;
}

export async function refreshSession() {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error('No hay sesión activa');
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  const body = await response.json();

  if (!response.ok || !body.success) {
    clearSession();
    throw new Error(body.error?.message || 'No se pudo renovar la sesión');
  }

  saveSession(body.data);
  return body.data;
}

export function logout() {
  clearSession();
  window.location.href = '/login.html';
}
