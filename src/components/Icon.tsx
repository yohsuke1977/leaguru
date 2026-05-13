type IconProps = {
  name: string
  size?: number
  stroke?: number
  style?: React.CSSProperties
}

export default function Icon({ name, size = 24, stroke = 1.6, ...rest }: IconProps) {
  const props = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: stroke,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    ...rest,
  }
  switch (name) {
    case 'trophy': return <svg {...props}><path d="M7 4h10v3a5 5 0 0 1-10 0V4Z" /><path d="M17 5h3a2 2 0 0 1 2 2v1a4 4 0 0 1-4 4" /><path d="M7 5H4a2 2 0 0 0-2 2v1a4 4 0 0 0 4 4" /><path d="M9 21h6" /><path d="M12 17v4" /><path d="M10 13h4l-1 4h-2l-1-4Z" /></svg>
    case 'calendar': return <svg {...props}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18" /><path d="M8 3v4" /><path d="M16 3v4" /><circle cx="12" cy="14" r="1.2" fill="currentColor" stroke="none" /><circle cx="16" cy="14" r="1.2" fill="currentColor" stroke="none" /><circle cx="8" cy="17" r="1.2" fill="currentColor" stroke="none" /></svg>
    case 'chart': return <svg {...props}><path d="M3 21h18" /><rect x="5" y="13" width="3.5" height="6" rx="1" /><rect x="10.25" y="9" width="3.5" height="10" rx="1" /><rect x="15.5" y="5" width="3.5" height="14" rx="1" /></svg>
    case 'megaphone': return <svg {...props}><path d="M3 11v3a2 2 0 0 0 2 2h2" /><path d="M7 16V8l11-4v18l-11-4" /><path d="M8 17v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2" /><path d="M19 8a3 3 0 0 1 0 6" /></svg>
    case 'mobile': return <svg {...props}><rect x="6" y="2" width="12" height="20" rx="2.5" /><path d="M11 18h2" /><path d="M9 5h6" strokeOpacity=".4" /></svg>
    case 'settings': return <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M12 1.5v3M12 19.5v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M1.5 12h3M19.5 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" /></svg>
    case 'play': return <svg {...props}><polygon points="6,4 20,12 6,20" fill="currentColor" stroke="none" /></svg>
    case 'arrow-right': return <svg {...props}><path d="M5 12h14" /><path d="m13 5 7 7-7 7" /></svg>
    case 'check': return <svg {...props} strokeWidth="2.4"><path d="m5 12 4 4L19 6" /></svg>
    case 'plus': return <svg {...props} strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
    case 'ball': return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M5 8c4 2 10 2 14 0" /><path d="M5 16c4-2 10-2 14 0" /></svg>
    case 'team': return <svg {...props}><circle cx="9" cy="9" r="3" /><path d="M3 19c0-3.5 2.7-6 6-6s6 2.5 6 6" /><circle cx="17" cy="7" r="2.5" /><path d="M15 19c0-2.5 1.5-4.5 4-5" /></svg>
    case 'kids': return <svg {...props}><circle cx="12" cy="7" r="3" /><path d="M6 21c0-3 2.7-5 6-5s6 2 6 5" /><path d="M9 4c0-1 1-1.5 3-1.5S15 3 15 4" /></svg>
    case 'office': return <svg {...props}><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2M13 16h2" /><path d="M10 21v-3h4v3" /></svg>
    case 'heart': return <svg {...props}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
    case 'bell': return <svg {...props}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></svg>
    case 'spark': return <svg {...props}><path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></svg>
    case 'lock': return <svg {...props}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
    default: return null
  }
}
