import React from 'react';
import { styles } from './styles';

// The left bar: a short list of playlists with a "Show more" button at the bottom.
// The big treble clef and floating notes are decoration drawn behind the list.
// The playlist names and song counts are fake placeholders.
export default function Sidebar() {
  const playlists = [
    { name: 'Liked Songs', count: 128 },
    { name: 'Study Beats', count: 42 },
    { name: 'Rainy Day', count: 31 },
    { name: 'Road Trip', count: 57 },
    { name: 'Late Night Drive', count: 24 },
    { name: 'Throwbacks', count: 88 },
    { name: 'Workout', count: 19 },
    { name: 'Sleepy Piano', count: 15 },
  ];

  return (
    <aside style={styles.sidebar}>
      {/* decoration */}
      <span style={styles.bigClef}>𝄞</span>
      <span style={{ ...styles.floatNote, left: '10px', top: '300px', fontSize: '2.4rem' }}>♪</span>
      <span style={{ ...styles.floatNote, left: '70px', top: '380px', fontSize: '3rem' }}>♫</span>
      <span style={{ ...styles.floatNote, left: '20px', top: '470px', fontSize: '2rem' }}>♬</span>

      <ul style={styles.playlistList}>
        {playlists.map((playlist, index) => (
          <li
            key={playlist.name}
            // The first playlist is highlighted to show what a selected one looks like
            style={index === 0 ? { ...styles.playlistItem, ...styles.playlistActive } : styles.playlistItem}
          >
            {playlist.name} ({playlist.count})
          </li>
        ))}
      </ul>

      <button style={styles.showMore}>Show more</button>
    </aside>
  );
}