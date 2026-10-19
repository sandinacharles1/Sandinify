import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import SongCard from './SongCard';
import { styles } from './styles';

// *********************************************
// *     HOME PAGE (where login/signup lead)   *
// *********************************************
// This file only arranges the pieces: Header on top, Sidebar on the left, songs on the right.
// Everything shown is fake placeholder data. Nothing here talks to the backend yet.
export default function HomePage() {
  // Fake songs. Later this list will come from your server.
  const recentSongs = [
    {
      id: 1,
      name: 'Midnight Static',
      artist: 'username',
      date: '15 Oct 2026',
      genres: ['Lo-fi'],
      moods: ['Chill', 'Sleepy'],
      tags: ['instrumental', 'late night'],
      description: 'A slow, hazy track recorded late at night. Good for studying or staring out a window.',
      length: '3:42',
      plays: 128,
      likes: 55,
      playlists: 6,
    },
    {
      id: 2,
      name: 'Paper Lanterns',
      artist: 'mapleroad',
      date: '12 Oct 2026',
      genres: ['Indie', 'Acoustic'],
      moods: ['Warm', 'Nostalgic'],
      tags: ['guitar', 'summer festival'],
      description: 'Soft guitar and a quiet vocal. Written about a summer festival that ended too soon.',
      length: '4:05',
      plays: 342,
      likes: 120,
      playlists: 21,
    },
    {
      id: 3,
      name: 'Clockwork Garden',
      artist: 'tinyorchestra',
      date: '09 Oct 2026',
      genres: ['Piano', 'Cinematic'],
      moods: ['Dreamy'],
      tags: ['music box', 'ticking rhythm'],
      description: 'Piano with a ticking rhythm underneath, like a music box in an overgrown greenhouse.',
      length: '2:58',
      plays: 87,
      likes: 33,
      playlists: 4,
    },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        <Header username="username" />

        <div style={styles.body}>
          <Sidebar />

          <main style={styles.main}>
            {/* Profile row: stamp-style picture on the left, name and buttons on the right */}
            <div style={styles.profileRow}>
              <div style={styles.stamp}>♪</div>

              <div style={styles.profileRight}>
                <h2 style={styles.username}>username</h2>
                <div style={styles.profileButtons}>
                  <button style={styles.profileButton}>Upload Song</button>
                  <button style={styles.profileButton}>New Playlist</button>
                  <button style={styles.profileButton}>Edit Profile</button>
                </div>
              </div>
            </div>

            {/* Recently listened / uploaded */}
            <h2 style={styles.sectionBand}>Recently listened and uploaded</h2>

            <div style={styles.songList}>
              {recentSongs.map((song) => (
                <SongCard key={song.id} song={song} />
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}