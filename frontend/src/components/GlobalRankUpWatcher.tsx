import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import apiClient from '../lib/api';
import { getCsgoRank } from '../pages/Dashboard';
import { RankUpCeremony } from './RankUpCeremony';

export const GlobalRankUpWatcher = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const [rankUpData, setRankUpData] = useState<{ oldRank: string; newRank: string; newRankImage: string; newRankColor: string } | null>(null);

  const checkXP = async () => {
    if (!user) return;
    try {
      const res = await apiClient.get('/auth/me/xp');
      const newXP = res.data.xp || 0;
      const storageKey = `lastRankTitle_${user.id}`;
      const lastRankTitle = localStorage.getItem(storageKey);
      const newRank = getCsgoRank(newXP);

      if (lastRankTitle && lastRankTitle !== newRank.title) {
        // Did we rank UP (forward) or just drop? Assume any change is rank up for now, 
        // or strictly verify we didn't go backwards. If xp mapping is sorted, we can check.
        setRankUpData({
          oldRank: lastRankTitle,
          newRank: newRank.title,
          newRankImage: newRank.image,
          newRankColor: newRank.color,
        });
      }
      localStorage.setItem(storageKey, newRank.title);
    } catch (e) {
      console.error('Failed to check XP for rank-up:', e);
    }
  };

  useEffect(() => {
    // Initial check when app loads
    checkXP();
  }, [user]);

  useEffect(() => {
    if (!socket || !user) return;

    // Listen to various events that could affect XP
    const handleCheck = () => {
      // Debounce slightly if multiple events fire
      setTimeout(checkXP, 2000);
    };

    socket.on('task_updated', handleCheck);
    socket.on('task_stage_completed', handleCheck);
    socket.on('user:quality_award', handleCheck);
    socket.on('user:bounty_awarded', handleCheck);

    return () => {
      socket.off('task_updated', handleCheck);
      socket.off('task_stage_completed', handleCheck);
      socket.off('user:quality_award', handleCheck);
      socket.off('user:bounty_awarded', handleCheck);
    };
  }, [socket, user]);

  return (
    <RankUpCeremony 
      rankUpData={rankUpData} 
      onClose={() => setRankUpData(null)} 
    />
  );
};
