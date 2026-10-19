// *********************************************
// *     STYLES FOR THE HOME PAGE              *
// *********************************************
// Your login-page greens and pinks, plus the extra shades needed for the "Archive of Our Own" look.
export const colors = {
  pageGreen: 'rgb(181, 201, 154)',
  softGreen: 'rgb(202, 225, 178)',
  darkGreen: 'rgb(48, 69, 20)',
  titleGreen: 'rgb(56, 80, 17)',
  pink: 'rgb(255, 192, 203)',
  pinkLight: 'rgb(255, 228, 234)',
  pinkCream: 'rgb(255, 245, 247)',
  pinkDeep: 'rgb(222, 120, 150)',
  link: 'rgb(176, 70, 110)',
  plum: 'rgb(114, 86, 114)',
  line: 'rgb(231, 190, 204)',
};

// POLKA DOTS: two layers of white circles, the second one shifted so the dots are staggered.
const polka = (dot, size) =>
  `radial-gradient(circle, ${dot} 0 ${size / 7}px, transparent ${size / 7 + 1}px) 0 0 / ${size}px ${size}px,` +
  `radial-gradient(circle, ${dot} 0 ${size / 7}px, transparent ${size / 7 + 1}px) ${size / 2}px ${size / 2}px / ${size}px ${size}px`;

// PIANO KEYS: an SVG picture turned into a repeating background. Drawn by code, so no image file is needed.
const keyWidth = 26;
const keyHeight = 60;
const blackKeyPositions = [0, 1, 3, 4, 5]; // black keys sit between certain white keys (like a real piano)
const pianoSvg =
  `<svg xmlns='http://www.w3.org/2000/svg' width='${keyWidth * 7}' height='${keyHeight}'>` +
  [0, 1, 2, 3, 4, 5, 6]
    .map((i) => `<rect x='${i * keyWidth}' y='0' width='${keyWidth}' height='${keyHeight}' fill='%23fff8fa' stroke='%23d7b4c1'/>`)
    .join('') +
  blackKeyPositions
    .map((i) => `<rect x='${(i + 1) * keyWidth - 8}' y='0' width='16' height='36' rx='2' fill='%23c9a0b1' stroke='%23b184a0'/>`)
    .join('') +
  `</svg>`;
const pianoBackground = `url("data:image/svg+xml;utf8,${pianoSvg}") repeat-x left top / auto 100%`;

const musicFont = "'Segoe UI Symbol', 'Noto Music', 'Apple Symbols', serif";

const creamButton = {
  padding: '5px 12px',
  border: `1px solid ${colors.line}`,
  borderRadius: '8px',
  background: 'linear-gradient(#ffffff, #ffe3ea)',
  boxShadow: '0 1px 2px rgba(114, 86, 114, 0.25)',
  color: colors.darkGreen,
  fontFamily: 'inherit',
  fontSize: '0.92rem',
  cursor: 'pointer',
};

export const styles = {
  // ---------- WHOLE PAGE: green with white polka dots ----------
  page: {
    minHeight: '100vh',
    background: `${polka('rgba(255,255,255,0.45)', 40)}, ${colors.pageGreen}`,
    fontFamily: 'Garamond, serif',
    color: colors.darkGreen,
    padding: '24px 16px 48px',
    boxSizing: 'border-box',
  },
  // The framed pink "paper" that holds everything
  wrapper: {
    maxWidth: '1180px',
    margin: '0 auto',
    borderRadius: '22px',
    overflow: 'hidden',
    border: `3px solid ${colors.line}`,
    boxShadow: '0 10px 30px rgba(48, 69, 20, 0.25)',
    background: `${polka('rgba(255,255,255,0.7)', 30)}, ${colors.pink}`,
  },

  // ---------- BANNER ----------
  banner: {
    position: 'relative',
    height: '120px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px',
    background:
      'radial-gradient(circle at 12% 130%, rgba(255,255,255,0.95) 0 16%, transparent 17%),' +
      'radial-gradient(circle at 34% 140%, rgba(255,255,255,0.85) 0 14%, transparent 15%),' +
      'radial-gradient(circle at 78% -30%, rgba(255,255,255,0.6) 0 18%, transparent 19%),' +
      'linear-gradient(110deg, #ffb6c8, #ffd4de 55%, #ffc2d1)',
    borderBottom: `3px solid ${colors.line}`,
  },
  titleBox: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    alignItems: 'baseline',
    gap: '10px',
  },
  siteTitle: {
    margin: 0,
    fontSize: '3rem',
    fontWeight: '400',
    fontStyle: 'italic',
    color: '#ffffff',
    textShadow: `2px 2px 0 ${colors.pinkDeep}, 0 0 14px rgba(222,120,150,0.8)`,
    letterSpacing: '1px',
  },
  beta: {
    fontSize: '1rem',
    fontStyle: 'italic',
    color: '#ffffff',
    textShadow: `1px 1px 0 ${colors.pinkDeep}`,
  },
  puddingBox: {
    position: 'absolute',
    right: '300px',
    top: '10px',
    display: 'flex',
    gap: '4px',
    zIndex: 1,
  },
  bannerRight: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  bannerButton: {
    ...creamButton,
    border: `2px solid ${colors.pinkDeep}`,
    borderRadius: '12px',
    color: colors.link,
    fontWeight: '700',
  },
  miniStamp: {
    width: '40px',
    height: '40px',
    borderRadius: '6px',
    border: '3px solid #ffffff',
    outline: `2px dotted ${colors.pinkDeep}`,
    background: colors.pinkLight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.link,
    fontFamily: musicFont,
    fontSize: '1.2rem',
  },

  // ---------- TAB BAR ----------
  tabBar: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    padding: '10px 28px 0',
    background: 'linear-gradient(#ffd9e1, #ffc6d3)',
    borderBottom: `3px solid ${colors.line}`,
  },
  tabs: {
    display: 'flex',
    gap: '6px',
  },
  tab: {
    padding: '8px 16px',
    border: `1px solid ${colors.line}`,
    borderBottom: 'none',
    borderRadius: '12px 12px 0 0',
    background: 'linear-gradient(#ffffff, #fff0f4)',
    color: colors.link,
    fontFamily: 'inherit',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  searchBox: {
    display: 'flex',
    gap: '6px',
    paddingBottom: '8px',
  },
  searchInput: {
    padding: '5px 12px',
    border: `1px solid ${colors.line}`,
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.85)',
    fontFamily: 'inherit',
    fontSize: '0.95rem',
    color: colors.darkGreen,
    outline: 'none',
  },
  searchButton: {
    ...creamButton,
    background: 'linear-gradient(#f4f4f4, #dcdcdc)',
    border: '1px solid #b8b8b8',
  },

  // ---------- BODY ----------
  body: {
    display: 'grid',
    gridTemplateColumns: '220px 1fr',
    gap: '20px',
    padding: '28px 24px 36px',
    alignItems: 'start',
  },

  // ---------- SIDEBAR ----------
  sidebar: {
    position: 'relative',
    minHeight: '560px',
    padding: '8px 4px 16px',
    overflow: 'hidden',
  },
  bigClef: {
    position: 'absolute',
    left: '-18px',
    top: '10px',
    fontFamily: musicFont,
    fontSize: '15rem',
    lineHeight: 1,
    color: 'rgba(255, 255, 255, 0.55)',
    userSelect: 'none',
    pointerEvents: 'none',
  },
  floatNote: {
    position: 'absolute',
    fontFamily: musicFont,
    color: 'rgba(255, 255, 255, 0.75)',
    userSelect: 'none',
    pointerEvents: 'none',
  },
  playlistList: {
    position: 'relative',
    zIndex: 1,
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  playlistItem: {
    textAlign: 'right',
    padding: '7px 16px',
    borderRadius: '10px 0 0 10px',
    color: colors.darkGreen,
    fontSize: '1.05rem',
    cursor: 'pointer',
  },
  
  playlistActive: {
    background: `linear-gradient(#e58aa5, ${colors.pinkDeep})`,
    color: '#ffffff',
    fontWeight: '700',
    textShadow: '0 1px 1px rgba(100,40,60,0.5)',
    boxShadow: '0 2px 4px rgba(114,86,114,0.3)',
  },
  showMore: {
    ...creamButton,
    position: 'relative',
    zIndex: 1,
    display: 'block',
    margin: '14px 0 0 auto',
    fontWeight: '700',
    color: colors.link,
  },

  // ---------- MAIN PANEL ----------
  main: {
    background: colors.pinkCream,
    border: `2px solid ${colors.line}`,
    borderRadius: '16px',
    boxShadow: 'inset 0 0 0 4px rgba(255,255,255,0.7), 0 3px 8px rgba(114,86,114,0.18)',
    padding: '24px',
  },
  profileRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '20px',
    marginBottom: '22px',
  },
  stamp: {
    width: '96px',
    height: '96px',
    flexShrink: 0,
    borderRadius: '6px',
    border: '6px solid #ffffff',
    outline: `3px dotted ${colors.pinkDeep}`,
    outlineOffset: '2px',
    boxShadow: '0 2px 6px rgba(114,86,114,0.35)',
    background: `linear-gradient(135deg, ${colors.pinkLight}, ${colors.pink})`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: musicFont,
    fontSize: '3rem',
    color: colors.link,
  },
  profileRight: {
    flex: 1,
    textAlign: 'right',
  },
  username: {
    margin: '0 0 12px',
    paddingBottom: '4px',
    fontSize: '1.9rem',
    fontWeight: '400',
    color: colors.titleGreen,
    borderBottom: `2px solid ${colors.titleGreen}`,
  },
  profileButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    flexWrap: 'wrap',
  },
  profileButton: {
    ...creamButton,
    background: 'linear-gradient(#f7f7f7, #dedede)',
    border: '1px solid #b9b9b9',
  },
  sectionBand: {
    margin: '0 0 16px',
    padding: '8px 14px',
    borderRadius: '10px',
    background: 'linear-gradient(#fff3d9, #ffe9c4)',
    border: `1px solid ${colors.line}`,
    fontSize: '1.15rem',
    fontWeight: '700',
    color: colors.titleGreen,
  },
  songList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  // ---------- SONG CARD ----------
  songCard: {
    display: 'grid',
    gridTemplateColumns: '64px 1fr 84px',
    gap: '4px 14px',
    padding: '14px 16px 0',
    background: '#ffffff',
    border: `1px solid ${colors.line}`,
    borderRadius: '8px',
    boxShadow: '0 1px 4px rgba(114,86,114,0.18)',
  },
  iconColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignItems: 'center',
  },
  coverStamp: {
    width: '52px',
    height: '52px',
    borderRadius: '4px',
    border: '4px solid #ffffff',
    outline: `2px dotted ${colors.pinkDeep}`,
    boxShadow: '0 1px 3px rgba(114,86,114,0.3)',
    background: `linear-gradient(135deg, ${colors.pinkLight}, ${colors.pink})`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: musicFont,
    fontSize: '1.6rem',
    color: colors.link,
  },
  doneIcon: {
    width: '28px',
    height: '28px',
    border: `1px solid ${colors.line}`,
    background: colors.softGreen,
    color: colors.darkGreen,
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  songTitle: {
    margin: 0,
    fontSize: '1.15rem',
    fontWeight: '400',
  },
  link: {
    color: colors.link,
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  rightColumn: {
    textAlign: 'right',
    fontSize: '0.9rem',
  },
  counterBox: {
    display: 'inline-block',
    marginTop: '6px',
    padding: '1px 8px',
    background: colors.pinkDeep,
    color: '#ffffff',
    fontWeight: '700',
    borderRadius: '3px',
  },
  tagLine: {
    margin: '8px 0',
    fontSize: '0.95rem',
    lineHeight: 1.6,
  },
  tagLabel: {
    color: colors.pinkDeep,
    fontWeight: '700',
  },
  description: {
    margin: '0 0 10px',
    lineHeight: 1.55,
    fontSize: '1rem',
  },
  stats: {
    margin: '0 0 12px',
    fontSize: '0.92rem',
  },
  underline: {
    textDecoration: 'underline',
  },
  // The piano strip along the bottom, with the buttons sitting on the keys
  pianoStrip: {
    gridColumn: '1 / -1',
    position: 'relative',
    height: '60px',
    margin: '4px -16px 0',
    borderTop: `1px solid ${colors.line}`,
    background: pianoBackground,
    borderRadius: '0 0 8px 8px',
    boxShadow: 'inset 0 -3px 5px rgba(114,86,114,0.15)',
  },
  pianoLabel: {
    position: 'absolute',
    left: '10px',
    top: '10px',
    fontSize: '0.85rem',
    color: colors.pinkDeep,
  },
  
  pianoButtons: {
    position: 'absolute',
    right: '10px',
    bottom: '8px',
    display: 'flex',
    gap: '6px',
  },
  
  pianoDate: {
    position: 'absolute',
    right: '12px',
    top: '6px',
    fontSize: '0.8rem',
    color: colors.pinkDeep,
  },
  
  musicFont,
  creamButton,
};

// Automatically injects  selection colors the moment this file is imported
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerText = `::selection { background-color: ${colors.pinkDeep} !important; color: #fff !important; }`;
  document.head.appendChild(style);
}
