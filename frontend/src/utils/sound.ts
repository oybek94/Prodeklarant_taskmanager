/**
 * Yoqimli "ding-ding" bildirishnoma ovozi (Web Audio API orqali generatsiya qilinadi).
 * Bosqich yangilanganda socket orqali boshqa foydalanuvchilar eshitadigan ovozning aynan o'zi.
 * Aktyor socket broadcast'idan istisno qilinganligi sababli, uni lokal chalish uchun ishlatiladi.
 */
export const playNotificationSound = (): void => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    const now = audioCtx.currentTime;

    // Pleasant "ding-ding" sound
    oscillator.frequency.setValueAtTime(523.25, now);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    oscillator.frequency.setValueAtTime(659.25, now + 0.15);
    gainNode.gain.setValueAtTime(0, now + 0.15);
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.17);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    oscillator.start(now);
    oscillator.stop(now + 0.5);
  } catch (e) {
    console.error('Audio play blocked:', e);
  }
};
