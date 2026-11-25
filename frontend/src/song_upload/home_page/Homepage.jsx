import React, { useEffect, useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import SongCard from './Songcard';
import AdaptivePlayer from './AdaptivePlayer';
import { styles } from './Styles';
import { fetchSongs } from '../api/songApi';

// *********************************************
// *     HOME PAGE (where login/signup lead)   *
// *********************************************
// This file only arranges the pieces: Header on top, Sidebar on the left, songs on the right.
export default function HomePage({ username = 'username', onUpload }) {
  const [recentSongs, setRecentSongs] = useState([]);
  const [songLoadState, setSongLoadState] = useState({ type: 'loading', message: '' });
  const [currentSong, setCurrentSong] = useState(null);
  const [playRequest, setPlayRequest] = useState(0);

  function playSong(song) {
    if (currentSong?.id === song.id) {
      setPlayRequest((request) => request + 1);
      return;
    }
    setCurrentSong(song);
    setPlayRequest(0);
  }

  useEffect(() => {
    let isMounted = true;
    let refreshTimer;

    async function loadSongs() {
      try {
        const songs = await fetchSongs();
        if (!isMounted) return;
        setRecentSongs(songs);
        setSongLoadState({ type: 'loaded', message: '' });
        if (songs.some((song) => song.status === 'PENDING' || song.status === 'PROCESSING')) {
          refreshTimer = window.setTimeout(loadSongs, 5000);
        }
      } catch (error) {
        if (!isMounted) return;
        setSongLoadState({
          type: 'error',
          message: error instanceof Error ? error.message : 'Could not load uploaded songs.'
        });
      }
    }

    loadSongs();

    return () => {
      isMounted = false;
      window.clearTimeout(refreshTimer);
    };
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        <Header username={username} onUpload={onUpload} />

        <div style={styles.body}>
          <Sidebar />

          <main style={styles.main}>
            {/* Profile row: stamp-style picture on the left, name and buttons on the right */}
            <div style={styles.profileRow}>
              <div style={styles.stamp}>♪</div>

              <div style={styles.profileRight}>
                <h2 style={styles.username}>{username}</h2>
                <div style={styles.profileButtons}>
                  <button type="button" style={styles.profileButton} onClick={onUpload}>
                    Upload Song
                  </button>
                  <button style={styles.profileButton}>New Playlist</button>
                  <button style={styles.profileButton}>Edit Profile</button>
                </div>
              </div>
            </div>

            {/* Recently listened / uploaded */}
            <h2 style={styles.sectionBand}>Recently listened and uploaded</h2>

            <div style={styles.songList}>
              {songLoadState.type === 'loading' && <p>Loading uploaded songs…</p>}
              {songLoadState.type === 'error' && (
                <p role="alert">{songLoadState.message}</p>
              )}
              {songLoadState.type === 'loaded' && recentSongs.length === 0 && (
                <p>No songs uploaded yet. Upload one to see it here.</p>
              )}
              {songLoadState.type === 'loaded' && recentSongs.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  isCurrent={currentSong?.id === song.id}
                  onPlay={playSong}
                />
              ))}
            </div>
          </main>
        </div>
      </div>
      {currentSong && (
        <AdaptivePlayer
          key={currentSong.id}
          song={currentSong}
          songs={recentSongs}
          playRequest={playRequest}
          onSelectSong={(song) => {
            setCurrentSong(song);
            setPlayRequest(0);
          }}
        />
      )}
    </div>
  );
}