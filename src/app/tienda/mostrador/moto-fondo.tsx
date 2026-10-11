// Dibujo de una moto en líneas, de adorno al fondo del modo mostrador.
export function MotoFondo({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 600 340"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="120" cy="250" r="80" />
      <circle cx="120" cy="250" r="62" />
      <circle cx="120" cy="250" r="16" />
      <circle cx="480" cy="250" r="80" />
      <circle cx="480" cy="250" r="62" />
      <circle cx="480" cy="250" r="16" />
      <path d="M120 250 L250 172 L362 172 L480 250" />
      <path d="M248 160 Q292 110 368 124 L392 160 Q330 176 256 172 Z" />
      <path d="M368 124 L468 116 Q484 120 480 136 L390 152" />
      <path d="M480 250 L432 104" />
      <path d="M412 96 L456 90" />
      <rect x="262" y="186" width="80" height="58" rx="10" />
      <path d="M300 250 Q380 276 470 266 L520 258" />
      <path d="M60 210 Q120 150 190 196" />
      <path d="M430 196 Q480 150 548 206" />
    </svg>
  );
}
