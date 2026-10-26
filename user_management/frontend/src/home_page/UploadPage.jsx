import React, { useState } from 'react';
import Header from './Header';
import { colors, styles } from './Styles';
import './UploadPage.css';

export default function UploadPage({ username, onBack, onUpload }) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0] || null;
    setFileError('');

    if (selectedFile && !selectedFile.name.toLowerCase().endsWith('.mp3')) {
      setFile(null);
      setFileError('Please choose a file with the .mp3 extension.');
      event.target.value = '';
      return;
    }

    setFile(selectedFile);
  }

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        <Header username={username} onUpload={onUpload} />
        <main style={uploadStyles.main}>
          <button type="button" onClick={onBack} style={uploadStyles.backButton}>
            ← Back to homepage
          </button>

          <section style={uploadStyles.card} aria-labelledby="upload-title">
            <h2 id="upload-title" style={uploadStyles.heading}>Upload a song</h2>
            <p style={uploadStyles.intro}>
              Choose a title and an MP3 file. Your artist name comes from your account.
            </p>

            <form style={uploadStyles.form} onSubmit={(event) => event.preventDefault()}>
              <label htmlFor="song-title" style={uploadStyles.label}>Song title</label>
              <input
                id="song-title"
                type="text"
                maxLength={200}
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Give your song a name"
                style={uploadStyles.input}
              />

              <label htmlFor="song-artist" style={uploadStyles.label}>Artist</label>
              <input
                id="song-artist"
                type="text"
                value={username}
                readOnly
                style={{ ...uploadStyles.input, ...uploadStyles.readOnlyInput }}
              />
            
              <label htmlFor="song-file" style={uploadStyles.label}>MP3 file</label>
              <input
                id="song-file"
                type="file"
                accept=".mp3,audio/mpeg"
                required
                onChange={handleFileChange}
                className="song-file-input"
                style={uploadStyles.fileInput}
              />
              {file && <span style={uploadStyles.fileName}>{file.name}</span>}
              {fileError && <p role="alert" style={uploadStyles.error}>{fileError}</p>}

              <p style={uploadStyles.notice} role="status">
                This is the upload page design only. Song saving will be enabled after the
                backend and object storage are added.
              </p>

              <div style={uploadStyles.actions}>
                <button type="button" onClick={onBack} style={uploadStyles.cancelButton}>
                  Cancel
                </button>
                <button type="submit" disabled style={uploadStyles.disabledButton}>
                  Upload unavailable
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}

const uploadStyles = {
  main: {
    maxWidth: '760px',
    margin: '0 auto',
    padding: '24px',
  },
  backButton: {
    display: 'block',
    marginBottom: '16px',
    padding: '6px 0',
    border: 'none',
    background: 'transparent',
    color: colors.link,
    font: 'inherit',
    cursor: 'pointer',
  },
  card: {
    padding: '28px',
    border: `2px solid ${colors.line}`,
    borderRadius: '16px',
    background: colors.pinkCream,
    boxShadow: '0 3px 8px rgba(114,86,114,0.18)',
  },
  heading: {
    margin: '0 0 8px',
    color: colors.titleGreen,
    fontSize: '2rem',
    fontWeight: '400',
  },
  intro: {
    margin: '0 0 24px',
    color: colors.darkGreen,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  label: {
    marginTop: '8px',
    color: colors.darkGreen,
    fontWeight: '700',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 12px',
    border: `1px solid ${colors.line}`,
    borderRadius: '8px',
    background: '#ffffff',
    color: colors.darkGreen,
    font: 'inherit',
  },
  readOnlyInput: {
    background: '#f5edf0',
  },
  fileInput: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px',
    border: `1px dashed ${colors.pinkDeep}`,
    borderRadius: '8px',
    background: '#ffffff',
    font: 'inherit',
  },
  fileName: {
    color: colors.darkGreen,
    fontSize: '0.95rem',
  },
  error: {
    margin: 0,
    color: '#9b1c31',
  },
  notice: {
    margin: '10px 0 0',
    padding: '12px',
    borderRadius: '8px',
    background: '#fff3d9',
    color: colors.darkGreen,
    lineHeight: 1.4,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '10px',
  },
  cancelButton: {
    padding: '8px 16px',
    border: `1px solid ${colors.line}`,
    borderRadius: '8px',
    background: '#ffffff',
    color: colors.link,
    font: 'inherit',
    cursor: 'pointer',
  },
  disabledButton: {
    padding: '8px 16px',
    border: `1px solid ${colors.pinkDeep}`,
    borderRadius: '8px',
    background: 'linear-gradient(#ffffff, #ffe3ea)',
    color: colors.link,
    font: 'inherit',
    fontWeight: '700',
    opacity: 0.6,
    cursor: 'not-allowed',
  },
};
