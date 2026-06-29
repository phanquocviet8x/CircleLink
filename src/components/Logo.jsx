import React from 'react';

/**
 * CircleLink Premium Minimal Logo Component
 * Supports 4 different concept variations:
 * 1. Orbital Connections (Vòng Tròn Quỹ Đạo)
 * 2. Infinite Unity (Vòng Lặp Vô Hạn)
 * 3. Synergic Triquetra (Nút Thắt Giao Thoa)
 * 4. Stellar Mesh (Mạng Lưới Chòm Sao)
 */
export default function Logo({ 
  variant = 1, 
  size = 40, 
  animated = true, 
  showText = false, 
  className = '' 
}) {
  const selectedVariant = parseInt(variant) || 1;
  const isAnimated = animated ? 'animated' : '';

  // Inline SVG logos definitions
  const renderSVG = () => {
    switch (selectedVariant) {
      case 2: // Infinite Unity (Vòng Lặp Vô Hạn)
        return (
          <svg 
            width={size} 
            height={size} 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className={`circlelink-svg svg-variant-2 ${isAnimated}`}
          >
            <defs>
              <linearGradient id="grad-inf-1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <filter id="glow-v2" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            {/* Left loop of infinity */}
            <path 
              d="M38 50 C 38 42, 22 28, 22 50 C 22 72, 38 58, 50 50 C 62 42, 78 28, 78 50 C 78 72, 62 58, 50 50 C 38 42, 22 28, 22 50" 
              stroke="url(#grad-inf-1)" 
              strokeWidth="8" 
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow-v2)"
              className="infinity-path"
            />
            {/* Core intersection pulse */}
            <circle cx="50" cy="50" r="5" fill="#f8fafc" className="core-node" />
          </svg>
        );
      
      case 3: // Synergic Triquetra (Nút Thắt Giao Thoa)
        return (
          <svg 
            width={size} 
            height={size} 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className={`circlelink-svg svg-variant-3 ${isAnimated}`}
          >
            <defs>
              <linearGradient id="grad-tri-1" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
              <linearGradient id="grad-tri-2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
              <filter id="glow-v3" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            {/* The overlapping arcs forming a modern triquetra */}
            <path 
              d="M50 20 C62 40, 78 48, 70 70 C58 68, 42 68, 30 70 C22 48, 38 40, 50 20 Z" 
              stroke="url(#grad-tri-1)" 
              strokeWidth="6" 
              strokeLinejoin="round"
              filter="url(#glow-v3)"
              className="triquetra-path"
            />
            <path 
              d="M50 48 C55 58, 65 65, 50 82 C35 65, 45 58, 50 48 Z" 
              fill="url(#grad-tri-2)"
              opacity="0.8"
              className="triquetra-core"
            />
            {/* Glowing vertices */}
            <circle cx="50" cy="20" r="4" fill="#f8fafc" />
            <circle cx="70" cy="70" r="4" fill="#f8fafc" />
            <circle cx="30" cy="70" r="4" fill="#f8fafc" />
          </svg>
        );

      case 4: // Stellar Mesh (Mạng Lưới Chòm Sao)
        return (
          <svg 
            width={size} 
            height={size} 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className={`circlelink-svg svg-variant-4 ${isAnimated}`}
          >
            <defs>
              <linearGradient id="grad-mesh-1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            {/* Connection lines */}
            <path d="M25 50 L50 25 M50 25 L75 50 M75 50 L50 75 M50 75 L25 50 M25 50 L50 50 M50 25 L50 50 M75 50 L50 50 M50 75 L50 50" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeDasharray="3 3" />
            <path d="M50 25 C50 25, 70 35, 75 50 C70 65, 50 75, 50 75 C30 65, 25 50, 25 50 C30 35, 50 25, 50 25" stroke="url(#grad-mesh-1)" strokeWidth="4" className="outer-mesh-ring" />
            
            {/* Constellation nodes */}
            <circle cx="50" cy="25" r="5" fill="#06b6d4" className="node node-top" />
            <circle cx="75" cy="50" r="5" fill="#8b5cf6" className="node node-right" />
            <circle cx="50" cy="75" r="5" fill="#ec4899" className="node node-bottom" />
            <circle cx="25" cy="50" r="5" fill="#3b82f6" className="node node-left" />
            <circle cx="50" cy="50" r="7" fill="#f8fafc" className="node node-center" />
          </svg>
        );

      case 1: // Orbital Connections (Vòng Tròn Quỹ Đạo) - DEFAULT
      default:
        return (
          <svg 
            width={size} 
            height={size} 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className={`circlelink-svg svg-variant-1 ${isAnimated}`}
          >
            <defs>
              <linearGradient id="grad-orbit-1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
              <filter id="glow-v1" x="-25%" y="-25%" width="150%" height="150%">
                <feGaussianBlur stdDeviation="4" result="glow" />
                <feComposite in="SourceGraphic" in2="glow" operator="over" />
              </filter>
            </defs>
            
            {/* Outer rings */}
            <circle cx="50" cy="50" r="35" stroke="url(#grad-orbit-1)" strokeWidth="4" strokeLinecap="round" strokeDasharray="140 80" className="orbit-ring-1" filter="url(#glow-v1)" />
            <circle cx="50" cy="50" r="23" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeDasharray="30 20" className="orbit-ring-2" />
            
            {/* Orbiting nodes */}
            <circle cx="85" cy="50" r="5" fill="#06b6d4" className="orbit-node-1" />
            <circle cx="50" cy="27" r="4" fill="#a78bfa" className="orbit-node-2" />
            <circle cx="27" cy="50" r="3" fill="#ec4899" className="orbit-node-3" />
            
            {/* Center Core */}
            <circle cx="50" cy="50" r="10" fill="url(#grad-orbit-1)" />
            <circle cx="50" cy="50" r="4" fill="#f8fafc" />
          </svg>
        );
    }
  };

  if (showText) {
    return (
      <div className={`logo ${className}`}>
        <div className="logo-icon-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
          {renderSVG()}
        </div>
        <span className="logo-text">
          Circle<span>Link</span>
        </span>
      </div>
    );
  }

  return (
    <div className={`logo-icon-wrapper ${className}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {renderSVG()}
    </div>
  );
}
