import { Icon } from '@iconify/react';

interface RankUpData {
  oldRank: string;
  newRank: string;
  newRankImage: string;
  newRankColor: string;
}

interface Props {
  rankUpData: RankUpData | null;
  onClose: () => void;
}

export const RankUpCeremony = ({ rankUpData, onClose }: Props) => {
  if (!rankUpData) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#080b13', fontFamily: "'Inter', sans-serif" }}
      onClick={onClose}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        
        @keyframes neo-bg-pulse {
          0%,100% { transform: scale(1) translate(-50%, -50%); opacity: 0.5; }
          50% { transform: scale(1.1) translate(-50%, -50%); opacity: 0.8; }
        }
        @keyframes neo-spin-slow {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes neo-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }
        @keyframes csgo-scanline-fast {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 0.1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes csgo-laser-sweep {
          0% { left: -20%; opacity: 0; }
          50% { opacity: 0.5; }
          100% { left: 120%; opacity: 0; }
        }
        @keyframes neo-slide-up {
          0% { transform: translateY(40px); opacity: 0; filter: blur(5px); }
          100% { transform: translateY(0); opacity: 1; filter: blur(0); }
        }
        @keyframes neo-scale-in {
          0% { transform: scale(0.6) translateY(40px); opacity: 0; filter: blur(10px) brightness(2); }
          50% { transform: scale(1.05) translateY(-5px); filter: blur(0) brightness(1.2); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; filter: blur(0) brightness(1); }
        }
        @keyframes neo-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .csgo-text-gold {
          background: linear-gradient(to right, #fde68a, #fbbf24 40%, #f59e0b 60%, #fde68a);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      {/* Deep Ambient Background */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, rgba(14,18,34,0.9) 0%, rgba(2,3,7,1) 100%)',
        zIndex: 1
      }} />

      {/* CS:GO HUD Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)'
      }}/>
      
      <div className="absolute top-0 left-0 right-0 h-[2px] z-0 pointer-events-none" style={{
        background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.8), transparent)',
        animation: 'csgo-scanline-fast 4s linear infinite'
      }}/>

      {/* Laser Sweep */}
      <div className="absolute inset-y-0 w-[400px] z-0 pointer-events-none" style={{
        background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.03), transparent)',
        transform: 'skewX(-25deg)',
        animation: 'csgo-laser-sweep 6s ease-in-out infinite'
      }} />

      {/* Massive Glowing Orb behind the rank */}
      <div className="absolute top-1/2 left-1/2 pointer-events-none" style={{
        width: '600px',
        height: '600px',
        background: `radial-gradient(circle, ${rankUpData.newRankColor.includes('amber') || rankUpData.newRankColor.includes('yellow') ? 'rgba(251,191,36,0.2)' : 'rgba(99,102,241,0.2)'} 0%, transparent 65%)`,
        animation: 'neo-spin-slow 20s linear infinite, neo-bg-pulse 4s ease-in-out infinite',
        zIndex: 0,
        filter: 'blur(50px)'
      }} />

      {/* Floating Glass Shards (CS:GO Yellow/Gold tint) */}
      {Array.from({ length: 15 }).map((_, i) => {
        const size = 20 + Math.random() * 60;
        return (
          <div
            key={i}
            className="absolute pointer-events-none rounded-sm border border-yellow-500/10 shadow-[0_0_15px_rgba(251,191,36,0.05)]"
            style={{
              width: size,
              height: size * (Math.random() > 0.5 ? 1.5 : 0.8),
              background: 'linear-gradient(135deg, rgba(251,191,36,0.03) 0%, rgba(255,255,255,0) 100%)',
              backdropFilter: 'blur(8px)',
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
              animation: `neo-float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
              zIndex: 1,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        );
      })}

      {/* Horizontal CS:GO divider lines */}
      <div className="absolute top-[25%] left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent z-0" />
      <div className="absolute bottom-[25%] left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent z-0" />

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full px-4" onClick={e => e.stopPropagation()}>
        
        {/* Top Label (CS:GO Military style) */}
        <div style={{
          animation: 'neo-slide-up 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
          opacity: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div className="w-8 h-[1px] bg-yellow-500" />
          <span className="font-black text-[10px] sm:text-xs uppercase tracking-[0.3em] text-yellow-500" style={{
            textShadow: '0 0 10px rgba(251,191,36,0.5)'
          }}>
            PROMOTED / UNVON QO'LGA KIRITILDI
          </span>
          <div className="w-8 h-[1px] bg-yellow-500" />
        </div>

        {/* Huge Rank Image */}
        <div style={{
          marginTop: '3rem',
          marginBottom: '2rem',
          position: 'relative',
          animation: 'neo-scale-in 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s forwards',
          opacity: 0
        }}>
          <img
            src={rankUpData.newRankImage}
            alt={rankUpData.newRank}
            style={{
              width: '320px',
              height: 'auto',
              filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.8)) drop-shadow(0 0 80px rgba(251,191,36,0.15))',
              animation: 'neo-float 6s ease-in-out infinite'
            }}
          />
        </div>

        {/* Text Section (CS:GO Gold Text) */}
        <div className="text-center" style={{
          animation: 'neo-slide-up 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.4s forwards',
          opacity: 0
        }}>
          <h1 className="csgo-text-gold drop-shadow-lg font-black uppercase tracking-wider" style={{
            fontSize: 'clamp(3rem, 7vw, 5.5rem)',
            lineHeight: 1,
            marginBottom: '1rem',
          }}>
            {rankUpData.newRank}
          </h1>
          
          <div className="flex justify-center items-center gap-1 mt-4 italic">
            <span className="text-gray-500 font-bold tracking-widest text-xs">{rankUpData.oldRank.toUpperCase()}</span>
            <span className="text-yellow-600/80 mx-3 tracking-widest leading-none" style={{ transform: 'scale(1.5, 1)' }}>→</span>
            <span className="text-yellow-400 font-black tracking-widest text-sm drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">{rankUpData.newRank.toUpperCase()}</span>
          </div>
        </div>

        {/* Contemporary Button with CS:GO accents */}
        <button
          onClick={onClose}
          className="mt-14 px-10 py-4 font-black uppercase text-white tracking-[0.2em] transition-all duration-300 hover:scale-[1.03] active:scale-95 group relative overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(251,191,36,0.3)',
            borderLeft: '4px solid #fbbf24',
            borderRight: '4px solid #fbbf24',
            animation: 'neo-slide-up 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.6s forwards',
            opacity: 0,
            boxShadow: '0 0 20px rgba(251,191,36,0.05)'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/10 to-yellow-500/0 group-hover:via-yellow-500/20 transition-all opacity-0 group-hover:opacity-100" style={{
            backgroundSize: '200% auto',
            animation: 'neo-shimmer 2s linear infinite'
          }} />
          <span className="relative z-10 flex items-center gap-3 drop-shadow-md text-sm">
            Tasdiqlash <Icon icon="lucide:crosshair" className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
          </span>
        </button>
      </div>
    </div>
  );
};
