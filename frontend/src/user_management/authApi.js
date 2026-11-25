export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  const response = await fetch(`${API_BASE_URL}/api/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  if (!response.ok) return false;

  const result = await response.json();
  if (!result.accessToken) return false;
  localStorage.setItem('accessToken', result.accessToken);
  return true;
}

export async function authenticatedFetch(url, options = {}) {
  const send = () => fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`
    }
  });

  let response = await send();
  if (response.status === 401 && await refreshAccessToken()) {
    response = await send();
  }
  return response;
}

export async function getAuthenticatedUsername() {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/me`);
  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error(`Could not restore the session (HTTP ${response.status}).`);
  }

  const result = await response.json();
  const prefix = 'Hello ';
  if (typeof result.message !== 'string' || !result.message.startsWith(prefix)) {
    throw new Error('The server returned an invalid session response.');
  }
  return result.message.slice(prefix.length);
}

export function clearStoredSession() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('username');
}
