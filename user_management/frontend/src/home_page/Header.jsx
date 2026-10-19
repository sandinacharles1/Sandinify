import React from 'react';
import { styles } from './styles';
import { Pudding, Sparkle } from './Decor';

// The top of the page: the pink banner (title, pictures, buttons) and the tab bar under it.
// "username" is a placeholder. Later it will come from the logged-in user.
export default function Header({ username = 'username' }) {
  const tabs = ['Song Editor', 'Top Songs', 'AI Music Finder', 'AI Book Finder', 'Friends'];

  return (
    <header>
      {/* BANNER */}
      <div style={styles.banner}>
        {/* floating notes and sparkles in the background */}
        <span style={{ ...styles.floatNote, left: '300px', top: '8px', fontSize: '2rem', color: 'rgba(255,255,255,0.9)' }}>♪</span>
        <span style={{ ...styles.floatNote, left: '380px', top: '62px', fontSize: '1.6rem' }}>♫</span>
        <span style={{ ...styles.floatNote, left: '560px', top: '14px', fontSize: '1.8rem' }}>♬</span>
        <Sparkle size={22} style={{ position: 'absolute', left: '250px', top: '60px' }} />
        <Sparkle size={14} style={{ position: 'absolute', left: '470px', top: '30px' }} />
        <Sparkle size={18} style={{ position: 'absolute', left: '700px', top: '70px' }} />

        <div style={styles.titleBox}>
          <h1 style={styles.siteTitle}>Sandinify</h1>
        </div>

        {/* pudding pictures */}
        <div style={styles.puddingBox}>
          <Pudding size={104} tilt={-8} />
          <Pudding size={88} tilt={6} />
        </div>

        <div style={styles.bannerRight}>
          <div style={styles.miniStamp}>♪</div>
          <button style={styles.bannerButton}>Hi, {username}!</button>
          <button style={styles.bannerButton}>Upload</button>
          <button style={styles.bannerButton}>Log Out</button>
        </div>
      </div>

      {/* TAB BAR */}
      <nav style={styles.tabBar}>
        <div style={styles.tabs}>
          {tabs.map((name) => (
            <button key={name} style={styles.tab}>{name}</button>
          ))}
        </div>

        <div style={styles.searchBox}>
          <input type="text" placeholder="Search songs" style={styles.searchInput} />
          <button style={styles.searchButton}>Search</button>
        </div>
      </nav>
    </header>
  );
}