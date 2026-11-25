import React from 'react';

// *********************************************
// *     DECORATIVE GRAPHICS (drawn in code)   *
// *********************************************
// These are SVG pictures: shapes described with text, so they need no image files
// and stay sharp at any size.

// A little pudding cup with a cream top and a strawberry, standing in for the
// ice cream pictures in your reference banner.
export function Pudding({ size = 96, tilt = 0 }) {
  return (
    <svg width={size} height={size * 0.85} viewBox="0 0 120 102" style={{ transform: `rotate(${tilt}deg)` }}>
      {/* cup */}
      <path d="M20 52 L100 52 L90 94 Q60 101 30 94 Z" fill="#ffd0db" stroke="#e08ca5" strokeWidth="2" />
      {/* white stripe on the cup */}
      <path d="M23 64 L97 64 L95 73 L25 73 Z" fill="#ffffff" opacity="0.9" />
      {/* cream dome */}
      <path d="M20 52 Q16 20 60 18 Q104 20 100 52 Z" fill="#fff8ee" stroke="#ecd0b0" strokeWidth="2" />
      {/* cream swirl highlights */}
      <path d="M36 44 Q48 30 62 36" fill="none" stroke="#f3dcc0" strokeWidth="3" strokeLinecap="round" />
      <path d="M62 46 Q78 34 88 42" fill="none" stroke="#f3dcc0" strokeWidth="3" strokeLinecap="round" />
      {/* strawberry on top */}
      <circle cx="60" cy="14" r="10" fill="#ff5d85" stroke="#d93d66" strokeWidth="1.5" />
      <path d="M54 6 Q60 0 66 6 Q60 8 54 6 Z" fill="#6fa650" />
      <circle cx="56" cy="14" r="1.2" fill="#ffe0e8" />
      <circle cx="63" cy="12" r="1.2" fill="#ffe0e8" />
      <circle cx="60" cy="18" r="1.2" fill="#ffe0e8" />
    </svg>
  );
}

// A four-point sparkle
export function Sparkle({ size = 18, color = '#ffffff', style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" style={style}>
      <path d="M10 0 Q11 9 20 10 Q11 11 10 20 Q9 11 0 10 Q9 9 10 0 Z" fill={color} />
    </svg>
  );
}