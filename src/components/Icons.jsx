const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function PlayIcon({ size = 18 }) {
  return (
    <svg {...base} width={size} height={size} fill="currentColor" stroke="none">
      <path d="M7 4.5v15l13-7.5-13-7.5z" />
    </svg>
  );
}

export function PauseIcon({ size = 18 }) {
  return (
    <svg {...base} width={size} height={size} fill="currentColor" stroke="none">
      <rect x="6" y="4.5" width="4" height="15" rx="1" />
      <rect x="14" y="4.5" width="4" height="15" rx="1" />
    </svg>
  );
}

export function SkipBackIcon({ size = 18 }) {
  return (
    <svg {...base} width={size} height={size} fill="currentColor" stroke="none">
      <rect x="4" y="4.5" width="2.4" height="15" rx="0.5" />
      <path d="M19 4.5v15l-11-7.5 11-7.5z" />
    </svg>
  );
}

export function SkipForwardIcon({ size = 18 }) {
  return (
    <svg {...base} width={size} height={size} fill="currentColor" stroke="none">
      <path d="M5 4.5v15l11-7.5-11-7.5z" />
      <rect x="17.6" y="4.5" width="2.4" height="15" rx="0.5" />
    </svg>
  );
}

export function ShuffleIcon({ size = 16 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M3 7h3.2c1.8 0 2.7.7 3.6 1.9l.7.9" />
      <path d="M3 17h3.2c1.8 0 2.7-.7 3.6-1.9l3.7-4.9c.9-1.2 1.8-1.9 3.6-1.9H21" />
      <path d="M18 4.5l3 2.5-3 2.5" />
      <path d="M18 14.5l3 2.5-3 2.5" />
      <path d="M13.5 14l1.2 1.6c.9 1.2 1.8 1.9 3.6 1.9H21" />
    </svg>
  );
}

export function RepeatIcon({ size = 16 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M17 2.5l3.5 3.5L17 9.5" />
      <path d="M3.5 11V9a4 4 0 0 1 4-4H20" />
      <path d="M7 21.5l-3.5-3.5L7 14.5" />
      <path d="M20.5 13v2a4 4 0 0 1-4 4H4" />
    </svg>
  );
}
