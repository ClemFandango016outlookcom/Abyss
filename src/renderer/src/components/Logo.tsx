export function Logo({ size = 20 }: { size?: number }): JSX.Element {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 32 32" fill="none">
      <defs>
        <radialGradient id="abyssCore" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#c8fff4" />
          <stop offset="100%" stopColor="#2bbfa6" />
        </radialGradient>
        <linearGradient id="abyssRing" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7bffe4" />
          <stop offset="100%" stopColor="#129a86" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14" stroke="url(#abyssRing)" strokeWidth="1.5" opacity="0.32" />
      <circle cx="16" cy="16" r="10" stroke="url(#abyssRing)" strokeWidth="1.8" opacity="0.6" />
      <circle cx="16" cy="16" r="6" stroke="url(#abyssRing)" strokeWidth="2" opacity="0.92" />
      <circle cx="16" cy="16" r="2.6" fill="url(#abyssCore)" />
    </svg>
  )
}
