export function Logo({ size = 20 }: { size?: number }): JSX.Element {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="abyssg" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#6c5ce7" />
          <stop offset="1" stopColor="#00d2c6" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14" stroke="url(#abyssg)" strokeWidth="2.2" opacity="0.55" />
      <circle cx="16" cy="16" r="9" stroke="url(#abyssg)" strokeWidth="2.2" opacity="0.8" />
      <circle cx="16" cy="16" r="3.4" fill="url(#abyssg)" />
    </svg>
  )
}
