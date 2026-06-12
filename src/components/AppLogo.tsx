export function AppLogo() {
  return (
    <svg className="app-logo" viewBox="0 0 128 128" aria-hidden="true">
      <rect width="128" height="128" rx="26" fill="#1f7a73" />
      <path
        d="M42 24h34l18 18v62H42z"
        fill="#ffffff"
        stroke="#d8f1ee"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M76 24v18h18" fill="#d8f1ee" />
      <g transform="translate(16 16) scale(.7)">
        <path
          d="M51 74V52h6l7 11 7-11h6v22h-6V62l-5 8h-4l-5-8v12zm31 0V52h9c7 0 12 4 12 11s-5 11-12 11zm6-5h3c4 0 6-2 6-6s-2-6-6-6h-3z"
          fill="#1f7a73"
        />
      </g>
      <rect x="52" y="87" width="35" height="6" rx="3" fill="#1f7a73" />
    </svg>
  )
}
