import { API_BASE_URL, authenticatedFetch } from '../../user_management/authApi';

const SONG_UPLOAD_PATH = '/api/songs/upload';

async function readResponse(response) {
  try {
    const result = await response.json();
    return result && typeof result === 'object' ? result : {};
  } catch {
    return {};
  }
}

export async function fetchSongs() {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/songs`);
  const result = await readResponse(response);
  if (!response.ok) {
    throw new Error(result.message || `Could not load songs (HTTP ${response.status}).`);
  }
  if (!Array.isArray(result)) {
    throw new Error('The server returned an invalid songs response.');
  }
  const apiBase = API_BASE_URL.replace(/\/$/, '');
  return result.map((song) => ({
    ...song,
    manifestUrl: song.manifestUrl ? `${apiBase}${song.manifestUrl}` : null
  }));
}

export async function uploadSong({ file, name, username, genre, mood, tags, description }) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', name);
  formData.append('username', username);
  formData.append('genre', genre);
  formData.append('mood', mood);
  formData.append('tags', tags);
  formData.append('description', description);

  const response = await authenticatedFetch(`${API_BASE_URL}${SONG_UPLOAD_PATH}`, {
    method: 'POST',
    body: formData
  });

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
