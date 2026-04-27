import React, { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { useWindowSize } from 'react-use';
import { X } from 'lucide-react';
import { MEDAL_DETAILS, type MedalType } from '../../types/medals';
import { useSocket } from '../../contexts/SocketContext';
import apiClient from '../../lib/api';

interface MedalData {
  medalType: MedalType;
  cashBonus: number;
  xpBonus: number;
  notificationId?: number;
}

const MedalAnimation: React.FC = () => {
  const { width, height } = useWindowSize();
  const socket = useSocket();
  const [data, setData] = useState<MedalData | null>(null);
  const [showContent, setShowContent] = useState(false);

  const playFanfareSound = () => {
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

      // Triumphant Fanfare (C major arpeggio to high C)
      playTone(523.25, 'triangle', 0.0, 0.3, 0.2); // C5
      playTone(659.25, 'triangle', 0.15, 0.3, 0.2); // E5
      playTone(783.99, 'triangle', 0.3, 0.3, 0.2); // G5
      playTone(1046.50, 'triangle', 0.45, 1.5, 0.3); // C6 long
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    const fetchUnreadMedals = async () => {
      try {
        const res = await apiClient.get('/notifications?unread=true');
        const notifications = res.data;
        const medalNotif = notifications.find((n: any) => n.metadata?.isMedalAnimation === true);
        if (medalNotif) {
          setData({
            medalType: medalNotif.metadata.medalType,
            cashBonus: medalNotif.metadata.cashBonus,
            xpBonus: medalNotif.metadata.xpBonus,
            notificationId: medalNotif.id
          });
          playFanfareSound();
          setTimeout(() => setShowContent(true), 500);
        }
      } catch (err) {
        console.error("Failed to fetch medal notifications", err);
      }
    };

    fetchUnreadMedals();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleMedalAwarded = (payload: MedalData) => {
      setData(payload);
      setShowContent(false);
      playFanfareSound();
      setTimeout(() => setShowContent(true), 500);
    };

    socket.on('MEDAL_AWARDED', handleMedalAwarded);

    return () => {
      socket.off('MEDAL_AWARDED', handleMedalAwarded);
    };
  }, [socket]);

  const handleClose = async () => {
    if (data?.notificationId) {
      try {
        await apiClient.patch(`/notifications/${data.notificationId}/read`);
      } catch (err) {
        console.error("Failed to mark as read", err);
      }
    }
    setData(null);
    setShowContent(false);
  };

  if (!data) return null;

  const details = MEDAL_DETAILS[data.medalType] || MEDAL_DETAILS['FAST_WORKER'];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md">
      <Confetti
        width={width}
        height={height}
        recycle={true}
        numberOfPieces={400}
        gravity={0.12}
        colors={['#FFD700', '#FFA500', '#FF6347', '#00FA9A', '#00BFFF', '#EE82EE']}
      />

      <AnimatePresence>
        {showContent && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -50 }}
            transition={{ type: 'spring', damping: 15, stiffness: 100 }}
            className="relative w-full max-w-xl p-10 mx-4 overflow-hidden bg-white dark:bg-gray-900 rounded-3xl shadow-[0_0_50px_rgba(255,215,0,0.3)] border border-yellow-200 dark:border-yellow-900/50 text-center"
          >
            {/* Glowing background behind icon */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 blur-[80px] opacity-40 rounded-full ${details.bgClass}`} />

            <div className="relative z-10">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="mx-auto flex items-center justify-center w-40 h-40 mb-8"
              >
                <div className={`flex items-center justify-center w-full h-full rounded-full ${details.bgClass} shadow-2xl border-4 border-white dark:border-gray-800 overflow-hidden p-4`}>
                   <img src={details.image} alt={details.name} className="w-full h-full object-contain drop-shadow-xl" />
                </div>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 to-amber-600 mb-4 drop-shadow-sm"
              >
                Tabriklaymiz!
              </motion.h2>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-2xl text-gray-700 dark:text-gray-200 mb-3 font-medium">
                  Siz <strong className={`${details.color} font-black text-3xl tracking-wide`}>{details.name}</strong> medalini qo'lga kiritdingiz!
                </p>
                <p className="text-lg text-gray-500 dark:text-gray-400 mb-10 italic">
                  "{details.description}"
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, type: 'spring' }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <div className="flex items-center justify-center gap-3 py-4 px-8 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-2xl text-white font-bold text-2xl shadow-lg shadow-yellow-500/40 transform hover:scale-105 transition-transform w-full sm:w-auto">
                  <span className="text-3xl">✨</span>
                  <span>+{data.xpBonus} XP</span>
                </div>
                
                <div className="flex items-center justify-center gap-3 py-4 px-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl text-white font-bold text-2xl shadow-lg shadow-emerald-500/40 transform hover:scale-105 transition-transform w-full sm:w-auto">
                  <span className="text-3xl">💰</span>
                  <span>+{data.cashBonus.toLocaleString('ru-RU')} UZS</span>
                </div>
              </motion.div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                onClick={handleClose}
                className="mt-10 px-10 py-4 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-bold text-lg transition-all hover:scale-105 shadow-xl"
              >
                Ajoyib, davom etamiz!
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MedalAnimation;
