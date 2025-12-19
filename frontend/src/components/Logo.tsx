interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showTagline?: boolean;
}

export default function Logo({ size = 'md', showText = true, showTagline = true }: LogoProps) {
  const sizes = {
    sm: { logo: 'h-8 w-8', text: 'text-sm', tagline: 'text-[9px]', gap: 'gap-2' },
    md: { logo: 'h-10 w-10', text: 'text-lg', tagline: 'text-[10px]', gap: 'gap-3' },
    lg: { logo: 'h-16 w-16', text: 'text-2xl', tagline: 'text-xs', gap: 'gap-4' },
    xl: { logo: 'h-24 w-24', text: 'text-4xl', tagline: 'text-sm', gap: 'gap-5' },
  };

  return (
    <div className={`flex items-center ${sizes[size].gap}`}>
      {/* Logo - Stylized D/Arrow with geometric cutouts */}
      <div className={`${sizes[size].logo} flex-shrink-0`}>
        <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Main blue shape - stylized D/Arrow pointing right */}
          <path
            d="M15 15 L15 105 L75 105 L105 75 L105 45 L75 15 Z"
            fill="#1e40af"
          />
          {/* Large triangular cutout on top-left */}
          <path
            d="M15 15 L45 15 L15 45 Z"
            fill="white"
          />
          {/* Small rectangular cutout on bottom-left */}
          <rect x="15" y="75" width="20" height="20" fill="white" />
        </svg>
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col justify-center">
          <div className={`leading-none tracking-tight ${sizes[size].text} flex items-baseline gap-1`}>
            {/* PRO - bold solid medium-dark blue */}
            <span className="font-bold" style={{ color: '#1e40af' }}>PRO</span>
            {' '}
            {/* DEKLARANT - outline style lighter blue */}
            <span 
              className="font-bold tracking-wider"
              style={{
                color: 'transparent',
                WebkitTextStroke: '1.2px #3b82f6',
                textStroke: '1.2px #3b82f6',
                fontWeight: 600
              }}
            >
              DEKLARANT
            </span>
          </div>
          {showTagline && (
            <p 
              className={`font-medium mt-0.5 leading-tight tracking-wider ${sizes[size].tagline}`}
              style={{
                color: 'transparent',
                WebkitTextStroke: '0.7px #60a5fa',
                textStroke: '0.7px #60a5fa',
                fontWeight: 400
              }}
            >
              Bo'jxonadagi ishonchli vakilingiz
            </p>
          )}
        </div>
      )}
    </div>
  );
}

