import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js/light';
import { styles } from './Styles';
import {
  BANDWIDTH_SAFETY_FACTOR,
  getBufferedAhead,
  getInitialThroughputEstimate,
  saveThroughputEstimate,
  selectLevelIndex,
  updateEwma
} from '../api/adaptivePlayback';

const LOW_WATERMARK_SECONDS = 8;
const HIGH_WATERMARK_SECONDS = 24;
const RECOVERY_WATERMARK_SECONDS = 16;
const HLS_SEGMENT_SECONDS = 4;
const DOWNLOAD_PAUSE_THRESHOLD_SECONDS =
  HIGH_WATERMARK_SECONDS - HLS_SEGMENT_SECONDS;

function getNetworkHints() {
  return typeof navigator === 'undefined' ? null : navigator.connection;
}

function getPlaybackStorage() {
  try {
    return window.localStorage;
  } catch (error) {
    console.warn('Local storage is unavailable for playback estimates.', error);
    return null;
  }
}

function formatTime(value) {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  const seconds = Math.floor(value);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function AdaptivePlayer({ song, songs, playRequest, onSelectSong }) {
  const audioRef = useRef(null);
  const hlsRef = useRef(null);
  const throughputRef = useRef(null);
  const [playerState, setPlayerState] = useState('loading');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferStatus, setBufferStatus] = useState('');
  const [playbackError, setPlaybackError] = useState('');

  useEffect(() => {
    const audio = audioRef.current;
    let isMounted = true;
    setPlayerState('loading');
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPlaybackError('');
    setBufferStatus('Loading adaptive stream…');
    throughputRef.current = getInitialThroughputEstimate(
      getNetworkHints(),
      getPlaybackStorage()
    );

    const reportPlaybackError = (message) => {
      if (!isMounted) return;
      setPlaybackError(message);
      setBufferStatus('');
      setPlayerState('error');
    };

    if (Hls.isSupported()) {
      const initialEstimate = throughputRef.current || 96000;
      const hls = new Hls({
        autoStartLoad: false,
        startLevel: -1,
        abrEwmaDefaultEstimate: initialEstimate,
        abrBandWidthFactor: BANDWIDTH_SAFETY_FACTOR,
        abrBandWidthUpFactor: BANDWIDTH_SAFETY_FACTOR,
        maxBufferLength: HIGH_WATERMARK_SECONDS,
        maxMaxBufferLength: HIGH_WATERMARK_SECONDS,
        backBufferLength: 0,
        xhrSetup: (xhr) => {
          const token = getPlaybackStorage()?.getItem('accessToken');
          if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
      });
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!isMounted) return;
        const startLevel = selectLevelIndex(hls.levels, initialEstimate);
        hls.startLevel = startLevel;
        hls.autoLevelCapping = startLevel;
        hls.startLoad(-1);
        setPlayerState('ready');
        setBufferStatus('Adaptive stream ready.');
        audio.play().catch((error) => {
          if (error.name === 'NotAllowedError') {
            setBufferStatus('Stream ready. Press play to start.');
          } else {
            reportPlaybackError('Playback could not start. Try pressing play again.');
          }
        });
      });
      hls.on(Hls.Events.FRAG_BUFFERED, (_event, data) => {
        if (!isMounted) return;
        const durationMs = data.stats.loading.end - data.stats.loading.start;
        if (data.stats.loaded <= 0 || durationMs <= 0) return;

        const sample = (data.stats.loaded * 8 * 1000) / durationMs;
        throughputRef.current = updateEwma(throughputRef.current, sample);
        saveThroughputEstimate(
          throughputRef.current,
          getNetworkHints(),
          getPlaybackStorage()
        );

        const bufferedAhead = getBufferedAhead(audio);
        updateBufferLevel();
        setBufferStatus(
          `${Math.round(bufferedAhead)}s buffered · ${Math.round(throughputRef.current / 1000)} kbps`
        );
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          reportPlaybackError(`Playback failed: ${data.details || 'The HLS stream could not be loaded.'}`);
        }
      });
      hls.loadSource(song.manifestUrl);
      hls.attachMedia(audio);
    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = song.manifestUrl;
      audio.load();
      setPlayerState('ready');
      setBufferStatus('Native HLS playback; quality is managed by your browser.');
      audio.play().catch((error) => {
        if (error.name === 'NotAllowedError') {
          setBufferStatus('Stream ready. Press play to start.');
        } else {
          reportPlaybackError('Playback could not start. Try pressing play again.');
        }
      });
    } else {
      reportPlaybackError('This browser does not support HLS audio playback.');
    }

    return () => {
      isMounted = false;
      hlsRef.current?.destroy();
      hlsRef.current = null;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    };
  }, [song.id, song.manifestUrl]);

  useEffect(() => {
    if (playRequest === 0 || !audioRef.current) return;
    audioRef.current.play().catch((error) => {
      if (error.name !== 'NotAllowedError') {
        setPlaybackError('Playback could not start. Try the player controls again.');
      }
    });
  }, [playRequest]);

  const playableSongs = songs.filter(
    (item) => item.status === 'READY' && item.manifestUrl
  );
  const queueIndex = playableSongs.findIndex((item) => item.id === song.id);
  const previousSong = queueIndex > 0 ? playableSongs[queueIndex - 1] : null;
  const nextSong = queueIndex >= 0 && queueIndex < playableSongs.length - 1
    ? playableSongs[queueIndex + 1]
    : null;

  function moveInQueue(targetSong) {
    if (targetSong) onSelectSong(targetSong);
  }

  function seekBy(seconds) {
    const audio = audioRef.current;
    if (!audio) return;
    const end = Number.isFinite(audio.duration) ? audio.duration : Number.POSITIVE_INFINITY;
    audio.currentTime = Math.min(end, Math.max(0, audio.currentTime + seconds));
  }

  function updateBufferLevel() {
    const hls = hlsRef.current;
    const audio = audioRef.current;
    if (!hls || !audio) return;

    const bufferedAhead = getBufferedAhead(audio);
    if (bufferedAhead >= DOWNLOAD_PAUSE_THRESHOLD_SECONDS) {
      hls.stopLoad();
      return;
    }

    if (bufferedAhead < LOW_WATERMARK_SECONDS) {
      hls.autoLevelCapping = 0;
      hls.nextAutoLevel = 0;
      hls.startLoad();
    } else if (bufferedAhead >= RECOVERY_WATERMARK_SECONDS) {
      hls.autoLevelCapping = selectLevelIndex(hls.levels, throughputRef.current);
      hls.startLoad();
    }
  }

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <aside style={styles.playerBar} aria-label="Audio player">
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(event) => {
          setCurrentTime(event.currentTarget.currentTime);
          updateBufferLevel();
        }}
        onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
        onWaiting={updateBufferLevel}
        onPlaying={updateBufferLevel}
        onEnded={() => moveInQueue(nextSong)}
        onError={() => {
          if (hlsRef.current) return;
          setPlaybackError('The audio stream could not be played.');
          setPlayerState('error');
        }}
        style={{ display: 'none' }}
      />
      <div style={styles.playerMain}>
        <div style={styles.playerTrackInfo}>
          <strong style={styles.playerTitle}>{song.title}</strong>
          <span style={styles.playerArtist}>{song.artistName}</span>
        </div>
        <div style={styles.playerControls}>
          <button
            type="button"
            style={styles.playerButton}
            aria-label="Previous song"
            title="Previous song"
            disabled={!previousSong}
            onClick={() => moveInQueue(previousSong)}
          >
            |◀
          </button>
          <button
            type="button"
            style={styles.playerButton}
            aria-label="Go back 10 seconds"
            title="Go back 10 seconds"
            onClick={() => seekBy(-10)}
          >
            −10
          </button>
          <button
            type="button"
            style={styles.playerButton}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            title={isPlaying ? 'Pause' : 'Play'}
            disabled={playerState === 'loading' || playerState === 'error'}
            onClick={() => {
              const audio = audioRef.current;
              if (!audio) return;
              if (audio.paused) {
                audio.play().catch((error) => {
                  if (error.name !== 'NotAllowedError') {
                    setPlaybackError('Playback could not start. Try again.');
                  }
                });
              } else {
                audio.pause();
              }
            }}
          >
            {isPlaying ? 'Ⅱ' : '▶'}
          </button>
          <button
            type="button"
            style={styles.playerButton}
            aria-label="Go forward 10 seconds"
            title="Go forward 10 seconds"
            onClick={() => seekBy(10)}
          >
            +10
          </button>
          <button
            type="button"
            style={styles.playerButton}
            aria-label="Next song"
            title="Next song"
            disabled={!nextSong}
            onClick={() => moveInQueue(nextSong)}
          >
            ▶|
          </button>
        </div>
        <div style={styles.playerStatus} role={playbackError ? 'alert' : 'status'}>
          {playbackError || bufferStatus}
        </div>
        <div style={styles.playerProgress}>
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration > 0 ? duration : 1}
            step="0.1"
            value={duration > 0 ? Math.min(currentTime, duration) : 0}
            aria-label="Song position"
            disabled={playerState !== 'ready' || duration <= 0}
            onChange={(event) => {
              const time = Number(event.target.value);
              audioRef.current.currentTime = time;
              setCurrentTime(time);
            }}
            style={{
              ...styles.playerSeek,
              background: `linear-gradient(to right, ${styles.playerSeek.accentColor} ${progress}%, ${styles.playerSeekTrack} ${progress}%)`
            }}
          />
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </aside>
  );
}
