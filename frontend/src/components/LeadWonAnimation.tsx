import React, { useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { Icon } from '@iconify/react';
import confetti from 'canvas-confetti';

interface LeadWonData {
    leadId: number;
    companyName: string;
    sellerName: string;
    amount: string | null;
}

export default function LeadWonAnimation() {
    const socket = useSocket();
    const [data, setData] = useState<LeadWonData | null>(null);

    // Yutuq yutib olingandek (Jackpot/G'alaba) ovoz
    const playJackpotSound = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();

            const playTone = (freq: number, type: OscillatorType, startTime: number, duration: number, vol: number) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
                gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
                gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + startTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + startTime);
                osc.stop(ctx.currentTime + startTime + duration);
            };

            // Tezkor ko'tariluvchi zafar ohangi
            playTone(523.25, 'triangle', 0.0, 0.2, 0.15); // C5
            playTone(659.25, 'triangle', 0.1, 0.2, 0.15); // E5
            playTone(783.99, 'triangle', 0.2, 0.2, 0.15); // G5
            playTone(1046.50, 'triangle', 0.3, 0.2, 0.15); // C6
            
            // Yakuniy jarangdor g'alaba akkordi (uzun va balandroq)
            playTone(523.25, 'sine', 0.4, 3.0, 0.2); // C5
            playTone(659.25, 'sine', 0.4, 3.0, 0.2); // E5
            playTone(1046.50, 'sine', 0.4, 3.0, 0.2); // C6
            playTone(1567.98, 'triangle', 0.4, 3.0, 0.1); // G6
            
            // Yutuq jaranglashi uchquni (tanga ovoziga o'xshash)
            playTone(2093.00, 'sine', 0.4, 1.0, 0.1); // C7
            playTone(2637.02, 'sine', 0.5, 1.0, 0.05); // E7

        } catch(e) {}
    };

    // Haqiqiy hlapushka animatsiyasi (canvas-confetti kutubxonasi)
    const fireConfetti = () => {
        const duration = 4000;
        const end = Date.now() + duration;
        const colors = ['#FDE047', '#F59E0B', '#34D399', '#60A5FA', '#A78BFA', '#F472B6'];

        (function frame() {
            // Chapdan otish
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0, y: 0.8 },
                colors: colors,
                zIndex: 10000,
                disableForReducedMotion: true
            });
            // O'ngdan otish
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1, y: 0.8 },
                colors: colors,
                zIndex: 10000,
                disableForReducedMotion: true
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    };

    useEffect(() => {
        if (!socket) return;

        const handleLeadWon = (payload: LeadWonData) => {
            setData(payload);
            playJackpotSound();
            fireConfetti();
        };

        socket.on('LEAD_WON', handleLeadWon);

        return () => {
            socket.off('LEAD_WON', handleLeadWon);
        };
    }, [socket]);

    if (!data) return null;

    return (
        <div 
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 bg-zinc-950/95 backdrop-blur-sm overflow-hidden" 
        >
            {/* Orqa fon nur effekti */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] h-[60vh] bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />

            {/* Asosiy Matn (Katta qilib yoyilgan, bloksiz) */}
            <div className="relative z-10 flex flex-col items-center text-center w-full animate-in slide-in-from-bottom-8 fade-in duration-700">
                
                {/* Tepada kichik ikonka */}
                <div className="mb-6 flex justify-center">
                    <div className="w-20 h-20 bg-gradient-to-tr from-amber-400/20 to-yellow-300/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-[0_0_30px_rgba(251,191,36,0.2)]">
                        <Icon icon="lucide:party-popper" className="w-10 h-10 text-yellow-400 drop-shadow-md animate-bounce" />
                    </div>
                </div>

                {/* Sarlavha */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-yellow-400 to-amber-600 drop-shadow-2xl mb-4 md:mb-8 pb-4 leading-normal px-2">
                    Muvaffaqiyatli<br className="sm:hidden" /> Kelishuv!
                </h1>
                
                {/* Mijoz nomi */}
                <p className="text-lg sm:text-3xl md:text-4xl text-gray-200 font-medium mb-10 md:mb-16 drop-shadow-lg px-2 leading-relaxed max-w-4xl">
                    <span className="text-yellow-400 font-bold whitespace-nowrap">{data.companyName}</span> endi bizning mijozimiz.
                </p>
                
                {/* Ko'rsatkichlar */}
                <div className="flex flex-row flex-wrap items-center justify-center gap-4 md:gap-12 w-full px-2 mb-10">
                    {data.sellerName && (
                        <div className="flex flex-col items-center gap-1.5 md:gap-2">
                            <span className="text-[10px] md:text-sm text-gray-400 uppercase tracking-[0.2em] font-bold">Sotuvchi</span>
                            <div className="text-base md:text-2xl text-white font-semibold flex items-center gap-2">
                                <Icon icon="lucide:user" className="w-4 h-4 md:w-6 md:h-6 text-blue-400" />
                                {data.sellerName}
                            </div>
                        </div>
                    )}

                    {data.amount && (
                        <div className="flex flex-col items-center gap-1.5 md:gap-2">
                            <span className="text-[10px] md:text-sm text-gray-400 uppercase tracking-[0.2em] font-bold">Hajm</span>
                            <div className="text-base md:text-2xl text-white font-semibold flex items-center gap-2">
                                <Icon icon="lucide:trending-up" className="w-4 h-4 md:w-6 md:h-6 text-amber-400" />
                                {data.amount}
                            </div>
                        </div>
                    )}
                </div>

                {/* Davom etish tugmasi (Asosiy va Mobil uchun juda qulay) */}
                <button
                    onClick={() => setData(null)}
                    className="mt-4 md:mt-6 px-8 md:px-10 py-3 md:py-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-base md:text-xl font-bold rounded-full shadow-[0_0_40px_rgba(245,158,11,0.6)] hover:scale-105 active:scale-95 transition-all z-50 flex items-center gap-2 md:gap-3"
                >
                    <Icon icon="lucide:check-circle" className="w-5 h-5 md:w-7 md:h-7" />
                    Zo'r! Davom etish
                </button>
            </div>
            
            <p className="absolute bottom-6 md:bottom-8 text-amber-400/80 text-sm md:text-2xl italic tracking-wide font-medium drop-shadow-lg text-center px-4">
                "Tashabbus va mehnat doim o'z mevasini beradi!"
            </p>
        </div>
    );
}
