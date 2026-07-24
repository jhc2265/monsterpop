const paths = {
  back: '<path d="m15 18-6-6 6-6"/><path d="M9 12h10"/>',
  sound: '<path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18 6a8 8 0 0 1 0 12"/>',
  mute: '<path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="m18 9-6 6"/><path d="m12 9 6 6"/>',
  logout: '<path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>',
  play: '<path d="m8 5 11 7-11 7V5Z"/>',
  trophy: '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v2a3 3 0 0 0 3 3"/><path d="M17 6h3v2a3 3 0 0 1-3 3"/>',
  chat: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.5-5A7 7 0 0 1 3 13V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v7Z"/>',
  home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
  refresh: '<path d="M20 6v5h-5"/><path d="M19 11a7 7 0 1 0-2 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  send: '<path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/>',
  spark: '<path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3Z"/>',
  sword: '<path d="m14.5 4.5 5-2-2 5L9 16l-3-3 8.5-8.5Z"/><path d="m5 14 5 5"/><path d="m4 20 3-3"/>',
  lock: '<rect width="14" height="11" x="5" y="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
  eyeOff: '<path d="m3 3 18 18"/><path d="M10.6 6.1A11 11 0 0 1 12 6c6.5 0 10 6 10 6a18 18 0 0 1-2.1 2.8"/><path d="M6.5 6.5C3.6 8.2 2 12 2 12s3.5 6 10 6a10 10 0 0 0 4-.8"/><path d="M9.9 9.9A3 3 0 0 0 14.1 14.1"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  settings: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.55V21h-4v-.08A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.08 14H3v-4h.08A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63 1.7 1.7 0 0 0 10 3.08V3h4v.08A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9 1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z"/>',
  crown: '<path d="m3 7 4 4 5-7 5 7 4-4-2 11H5L3 7Z"/><path d="M5 21h14"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13Z"/><path d="M8 7h8M8 11h6"/>',
}

export default function Icon({ name, size = 20, strokeWidth = 2, className = '' }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: paths[name] || paths.spark }} />
}
