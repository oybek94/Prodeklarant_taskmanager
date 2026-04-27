import fastWorkerImg from '../assets/medals/Tezkor_deklarant.png';
import shieldImg from '../assets/medals/Qalqon.png';
import eagleEyeImg from '../assets/medals/Lochin_koz.png';
import goldenKdImg from '../assets/medals/Oltin_KD_Master.png';
import growthImg from "../assets/medals/O'sish_Chempioni.png";
import nightOwlImg from '../assets/medals/Tungi_boyqush.png';
import companyPillarImg from '../assets/medals/Kompaniya_ustuni.png';
import problemSolverImg from '../assets/medals/Muammolar_Kushandasi.png';
import yearStarImg from '../assets/medals/Yil_Deklaranti.png';

export type MedalType =
  | 'FAST_WORKER'
  | 'SHIELD'
  | 'EAGLE_EYE'
  | 'GOLDEN_KD'
  | 'GROWTH_CHAMPION'
  | 'NIGHT_OWL'
  | 'COMPANY_PILLAR'
  | 'PROBLEM_SOLVER'
  | 'YEAR_STAR';

export interface UserMedal {
  id: number;
  userId: number;
  medalType: MedalType;
  period: string;
  cashBonus: number;
  xpBonus: number;
  awardedAt: string;
}

export const TIER_LABELS: Record<string, string> = {
  WEEKLY: 'Haftalik',
  MONTHLY: 'Oylik',
  QUARTERLY: 'Choraklik',
  YEARLY: 'Yillik'
};

export function formatPeriod(period: string) {
  if (period.includes('-W')) {
    const [year, week] = period.split('-W');
    return `${year}-yil ${week}-hafta`;
  }
  if (period.includes('-Q')) {
    const [year, quarter] = period.split('-Q');
    return `${year}-yil ${quarter}-chorak`;
  }
  if (period.length === 7 && period.includes('-')) {
    const [year, month] = period.split('-');
    const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
    return `${year}-yil ${months[parseInt(month) - 1]}`;
  }
  if (period.length === 4) {
    return `${period}-yil`;
  }
  return period;
}

export const MEDAL_DETAILS: Record<MedalType, { name: string; description: string; icon: string; image: string; color: string; bgClass: string; tier: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'; cashBonus: number; xpBonus: number }> = {
  FAST_WORKER: {
    name: 'Tezkor Deklarant',
    description: 'Bir hafta ichida eng ko\'p jarayonlarni muvaffaqiyatli yopgan xodim.',
    icon: '🏃‍♂️',
    image: fastWorkerImg,
    color: 'text-blue-500',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    tier: 'WEEKLY',
    cashBonus: 100000,
    xpBonus: 20
  },
  SHIELD: {
    name: 'Hafta Qalqoni',
    description: 'Hafta davomida eng ko\'p jarayonni bajarib, mutlaqo 0 ta xato qilgan.',
    icon: '🛡️',
    image: shieldImg,
    color: 'text-emerald-500',
    bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
    tier: 'WEEKLY',
    cashBonus: 50000,
    xpBonus: 10
  },
  EAGLE_EYE: {
    name: 'Lochin Ko\'z',
    description: 'Boshqa xodimlarning eng ko\'p xatosini topib, tizimga kiritgan.',
    icon: '🦅',
    image: eagleEyeImg,
    color: 'text-indigo-500',
    bgClass: 'bg-indigo-100 dark:bg-indigo-900/30',
    tier: 'WEEKLY',
    cashBonus: 100000,
    xpBonus: 20
  },
  GOLDEN_KD: {
    name: 'Oltin K/D Master',
    description: 'Oy davomida K/D reytingida eng yuqori ko\'rsatkichga erishgan.',
    icon: '💎',
    image: goldenKdImg,
    color: 'text-yellow-500',
    bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    tier: 'MONTHLY',
    cashBonus: 500000,
    xpBonus: 100
  },
  GROWTH_CHAMPION: {
    name: 'O\'sish Chempioni',
    description: 'O\'tgan oyga nisbatan o\'z natijalarini foiz hisobida eng ko\'p yaxshilagan.',
    icon: '📈',
    image: growthImg,
    color: 'text-green-500',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    tier: 'MONTHLY',
    cashBonus: 300000,
    xpBonus: 60
  },
  NIGHT_OWL: {
    name: 'Tungi Boyqush',
    description: 'Jamoa bilan tanlanadi (Mehnatsevarlik ramzi).',
    icon: '🦉',
    image: nightOwlImg,
    color: 'text-purple-500',
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    tier: 'MONTHLY',
    cashBonus: 200000,
    xpBonus: 40
  },
  COMPANY_PILLAR: {
    name: 'Kompaniya Ustuni',
    description: 'Oxirgi 3 oy davomida K/D reytingi eng yuqori bo\'lgan xodim.',
    icon: '👑',
    image: companyPillarImg,
    color: 'text-amber-600',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    tier: 'QUARTERLY',
    cashBonus: 1500000,
    xpBonus: 300
  },
  PROBLEM_SOLVER: {
    name: 'Muammolar Kushandasi',
    description: 'Oxirgi 3 oyda eng ko\'p sheriklarining xatosini topgan xodim.',
    icon: '🧠',
    image: problemSolverImg,
    color: 'text-rose-500',
    bgClass: 'bg-rose-100 dark:bg-rose-900/30',
    tier: 'QUARTERLY',
    cashBonus: 1000000,
    xpBonus: 200
  },
  YEAR_STAR: {
    name: 'Yil Deklaranti',
    description: 'Yil davomida eng ko\'p XP to\'plagan, eng baland K/D ga ega bo\'lgan mutlaq chempion.',
    icon: '🌟',
    image: yearStarImg,
    color: 'text-yellow-400',
    bgClass: 'bg-gradient-to-r from-yellow-300 to-amber-500',
    tier: 'YEARLY',
    cashBonus: 10000000,
    xpBonus: 1000
  }
};
