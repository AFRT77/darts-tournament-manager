import { ROUTES } from '../config.js';
import { apiRequest } from '../api/client.js';
import { getAccessToken, getProfile } from './session.js';

export function redirectByRole(role) {
  if (role === 'admin') {
    window.location.href = ROUTES.admin;
    return;
  }

  window.location.href = ROUTES.user;
}

export function redirectIfAuthenticated() {
  const token = getAccessToken();
  const profile = getProfile();

  if (token && profile?.role) {
    redirectByRole(profile.role);
  }
}

export async function requireAuth(requiredRole = null) {
  if (!getAccessToken()) {
    window.location.href = ROUTES.login;
    return null;
  }

  try {
    const { data } = await apiRequest('/auth/me');

    if (requiredRole && data.profile?.role !== requiredRole) {
      redirectByRole(data.profile?.role);
      return null;
    }

    return data;
  } catch {
    window.location.href = ROUTES.login;
    return null;
  }
}
