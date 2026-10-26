const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const SONG_UPLOAD_PATH = '/api/songs/upload';

async function refreshAccessToken() {
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

async function readResponse(response) {
  try {
    const result = await response.json();
    return result && typeof result === 'object' ? result : {};
  } catch {
    return {};
  }
}

export async function uploadSong({ file, name, username }) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', name);
  formData.append('username', username);

  const sendUpload = () => fetch(`${API_BASE_URL}${SONG_UPLOAD_PATH}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`
    },
    body: formData
  });

  let response = await sendUpload();
  if (response.status === 401 && await refreshAccessToken()) {
    response = await sendUpload();
  }

  const result = await readResponse(response);
  if (!response.ok) {
    const statusMessage = response.status === 401
      ? 'Your session expired. Please log in again.'
      : response.status === 413
        ? 'The selected file is too large.'
        : response.status === 415
          ? 'The server did not accept this file type.'
          : `The upload failed (HTTP ${response.status}).`;
    throw new Error(result.message || statusMessage);
  }

  return result;
}
