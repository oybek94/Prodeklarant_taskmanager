import React, { useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { Icon } from '@iconify/react';
import apiClient from '../lib/api';

interface XpAnimationData {
    type: 'XP_LOSS' | 'XP_GAIN';
    xpAmount: number;
    stageName: string;
    taskTitle: string;
    comment?: string;
    notificationId?: number;
}

export default function XpAnimation() {
    const socket = useSocket();
    const [data, setData] = useState<XpAnimationData | null>(null);
    const [mounted, setMounted] = useState(false);
    
    const [currentXp, setCurrentXp] = useState<number>(0);
    const [oldXp, setOldXp] = useState<number>(0);
    const [barProgress, setBarProgress] = useState<number>(0);

    const playModernSound = (type: 'gain' | 'loss') => {
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

            if (type === 'gain') {
                // Subtle modern success (iOS like)
                playTone(880, 'sine', 0, 0.1, 0.1);    // A5
                playTone(1108.73, 'sine', 0.1, 0.3, 0.1); // C#6
            } else {
                // Subtle modern error/loss
                playTone(440, 'triangle', 0, 0.15, 0.1);    // A4
                playTone(415.30, 'triangle', 0.1, 0.3, 0.1); // Ab4
            }
        } catch(e) {}
    };

    const initializeAnimation = async (payload: XpAnimationData) => {
        setData(payload);
        setMounted(true);

        try {
            // Fetch real XP
            const res = await apiClient.get('/auth/me');
            const realXp = res.data.xp || 1000; // fallback

            setCurrentXp(realXp);
            
            let previous = realXp;
            if (payload.type === 'XP_GAIN') {
                previous = realXp - payload.xpAmount;
            } else {
                previous = realXp + payload.xpAmount;
            }
            setOldXp(previous);

            // Level threshold assumption (e.g. 2000 XP per level for visual bar)
            const LEVEL_CAP = 2000;
            const basePercent = Math.min((previous / LEVEL_CAP) * 100, 100);
            const targetPercent = Math.min((realXp / LEVEL_CAP) * 100, 100);

            // Start bar at old XP
            setBarProgress(basePercent);

            // Play sound
            playModernSound(payload.type === 'XP_GAIN' ? 'gain' : 'loss');

            // Trigger animation after small delay
            setTimeout(() => {
                setBarProgress(targetPercent);
            }, 800);

        } catch (err) {
            // Fallback if auth/me fails
            const previous = payload.type === 'XP_GAIN' ? 0 : 100;
            const current = payload.type === 'XP_GAIN' ? 100 : 0;
            setOldXp(previous);
            setCurrentXp(current);
            setBarProgress(previous);
            playModernSound(payload.type === 'XP_GAIN' ? 'gain' : 'loss');
            setTimeout(() => setBarProgress(current), 800);
        }
    };

    useEffect(() => {
        const fetchUnreadXpAnimations = async () => {
            try {
                const res = await apiClient.get('/notifications?unread=true');
                const notifications = res.data;
                const xpNotif = notifications.find((n: any) => n.metadata?.isXpAnimation === true);
                if (xpNotif) {
                    const payload = { ...xpNotif.metadata, notificationId: xpNotif.id };
                    initializeAnimation(payload);
                }
            } catch (err) {}
        };
        fetchUnreadXpAnimations();
    }, []);

    useEffect(() => {
        if (!socket) return;
        const handleXpAnimation = (payload: XpAnimationData) => {
            initializeAnimation(payload);
        };
        socket.on('XP_ANIMATION', handleXpAnimation);
        return () => { socket.off('XP_ANIMATION', handleXpAnimation); };
    }, [socket]);



    const handleClose = async () => {
        setMounted(false);
        if (data?.notificationId) {
            try { await apiClient.patch(`/notifications/${data.notificationId}/read`); } catch (err) {}
        }
        setTimeout(() => setData(null), 400);
    };

    if (!data) return null;

    const isGain = data.type === 'XP_GAIN';

    return (
        <div 
            className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 transition-all duration-500 ease-out bg-slate-900/60 backdrop-blur-md ${
                mounted ? 'opacity-100' : 'opacity-0'
            }`}
        >
            <div 
                className={`relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 ease-out transform ${
                    mounted ? 'translate-y-0 scale-100' : 'translate-y-12 scale-95'
                }`}
            >
                {/* Header pattern */}
                <div className={`h-32 relative overflow-hidden flex items-center justify-center ${isGain ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                    <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiMwMDAiLz48L3N2Zz4=')]"></div>
                    
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center relative z-10 shadow-lg ${
                        isGain ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                        <Icon icon={isGain ? "lucide:trending-up" : "lucide:trending-down"} className="w-8 h-8" />
                    </div>
                </div>

                <div className="p-6 sm:p-8 text-center">
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white mb-2 tracking-tight">
                        {isGain ? 'XP Qo\'shildi' : 'XP Ayrildi'}
                    </h2>
                    
                    <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base font-medium mb-8">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{data.taskTitle}</span> ({data.stageName})
                    </p>

                    {/* Animated Progress Bar Container */}
                    <div className="mb-8">
                        <div className="flex justify-between items-end mb-3">
                            <div className="text-left">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Joriy XP</p>
                                <div className="text-3xl font-black text-slate-800 dark:text-white tabular-nums transition-all duration-1000">
                                    {barProgress !== (Math.min((oldXp / 2000) * 100, 100)) ? currentXp : oldXp}
                                </div>
                            </div>
                            
                            <div className={`text-xl font-bold ${isGain ? 'text-emerald-500' : 'text-red-500'}`}>
                                {isGain ? '+' : '-'}{data.xpAmount}
                            </div>
                        </div>

                        {/* The Bar */}
                        <div className="h-4 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden relative shadow-inner">
                            <div 
                                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1) ${
                                    isGain ? 'bg-emerald-500' : 'bg-red-500'
                                }`}
                                style={{ width: barProgress + '%' }}
                            />
                        </div>
                    </div>

                    {data.comment && (
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-8 text-left border border-slate-100 dark:border-slate-600">
                            <p className="text-sm text-slate-600 dark:text-slate-300 italic">
                                "{data.comment}"
                            </p>
                        </div>
                    )}

                    <button
                        onClick={handleClose}
                        className={`w-full py-3.5 rounded-xl font-semibold text-white transition-transform active:scale-[0.98] flex items-center justify-center gap-2 ${
                            isGain 
                                ? 'bg-slate-800 hover:bg-slate-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-md shadow-slate-900/10' 
                                : 'bg-slate-800 hover:bg-slate-700 dark:bg-red-600 dark:hover:bg-red-500 shadow-md shadow-slate-900/10'
                        }`}
                    >
                        Tushunarli
                    </button>
                </div>
            </div>
        </div>
    );
}
