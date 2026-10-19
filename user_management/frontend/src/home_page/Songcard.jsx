import React from 'react';
import { styles } from './styles';

// One song in the main list. It receives a "song" object and displays its fields.
// Later, this same card will be reused for every song that comes from your database.
export default function SongCard({ song }) {
  return (
    <article style={styles.songCard}>
      {/* LEFT: cover picture and a small "ready" icon */}
      <div style={styles.iconColumn}>
        <div style={styles.coverStamp}>♪</div>
        <div style={styles.doneIcon}>✓</div>
      </div>

      {/* MIDDLE: title, tags, description, numbers */}
      <div>
        <h3 style={styles.songTitle}>
          <span style={styles.link}>{song.name}</span> by <span style={styles.link}>{song.artist}</span>
        </h3>

        <p style={styles.tagLine}>
          <span style={styles.tagLabel}>Genre: </span>
          {song.genres.join(', ')}&nbsp;&nbsp;
          <span style={styles.tagLabel}>Mood: </span>
          {song.moods.join(', ')}&nbsp;&nbsp;
          <span style={styles.tagLabel}>Tags: </span>
          {song.tags.join(', ')}
        </p>

        <p style={styles.description}>{song.description}</p>

        <p style={styles.stats}>
          Length: {song.length}&nbsp;&nbsp;
          Plays: <span style={styles.underline}>{song.plays}</span>&nbsp;&nbsp;
          Likes: <span style={styles.underline}>{song.likes}</span>&nbsp;&nbsp;
          Playlists: <span style={styles.underline}>{song.playlists}</span>
        </p>
      </div>

      {/* RIGHT: date and counter */}
      <div style={styles.rightColumn}>
        <div>{song.date}</div>
        <span style={styles.counterBox}>{song.playlists}</span>
      </div>

      {/* BOTTOM: piano keys with buttons sitting on them */}
      <div style={styles.pianoStrip}>
        <span style={styles.pianoLabel}>Uploaded by {song.artist}</span>
        <div style={styles.pianoButtons}>
          <button style={styles.creamButton}>Play</button>
          <button style={styles.creamButton}>Add To Playlist</button>
          <button style={styles.creamButton}>Share</button>
        </div>
      </div>
    </article>
  );
}