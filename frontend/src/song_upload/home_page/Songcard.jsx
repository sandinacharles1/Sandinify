import React from 'react';
import { styles } from './Styles';

// One database-backed song in the main list.
export default function SongCard({ song, isCurrent, onPlay }) {
  const createdDate = song.createdAt
    ? new Date(song.createdAt).toLocaleDateString()
    : '';
  const statusIcon = song.status === 'READY'
    ? '✓'
    : song.status === 'FAILED'
      ? '!'
      : '…';
  const statusLabel = song.status
    ? song.status.charAt(0) + song.status.slice(1).toLowerCase()
    : 'Unknown';

  return (
    <article style={styles.songCard}>
      {/* LEFT: cover picture and a small "ready" icon */}
      <div style={styles.iconColumn}>
        <div style={styles.coverStamp}>♪</div>
        <div style={styles.doneIcon} aria-label={`Song status: ${statusLabel}`}>
          {statusIcon}
        </div>
      </div>

      {/* MIDDLE: title, tags, description, numbers */}
      <div>
        <h3 style={styles.songTitle}>
          <span style={styles.link}>{song.title}</span> by <span style={styles.link}>{song.artistName}</span>
        </h3>

        <p style={styles.tagLine}>
          <span style={styles.tagLabel}>Genre: </span>
          {song.genre || 'Not provided'}&nbsp;&nbsp;
          <span style={styles.tagLabel}>Mood: </span>
          {song.mood || 'Not provided'}&nbsp;&nbsp;
          <span style={styles.tagLabel}>Tags: </span>
          {song.tags || 'Not provided'}
        </p>

        {song.description && <p style={styles.description}>{song.description}</p>}
      </div>

      {/* RIGHT: date and counter */}
      <div style={styles.rightColumn}>
        <div>{createdDate}</div>
        <span style={styles.counterBox}>{statusLabel}</span>
      </div>

      {/* BOTTOM: piano keys with buttons sitting on them */}
      <div style={styles.pianoStrip}>
        <div style={styles.pianoButtons}>
          <button
            type="button"
            style={styles.creamButton}
            onClick={() => onPlay(song)}
            disabled={song.status !== 'READY' || !song.manifestUrl}
            title={song.status !== 'READY' ? 'Playback is available when processing finishes.' : undefined}
            aria-pressed={isCurrent}
          >
            {isCurrent ? 'Now Playing' : 'Play'}
          </button>
          <button style={styles.creamButton}>Add To Playlist</button>
          <button style={styles.creamButton}>Share</button>
        </div>
      </div>
    </article>
  );
}