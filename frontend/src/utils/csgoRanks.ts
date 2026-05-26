import silver1 from '../assets/ranks/silver_1.png';
import silver2 from '../assets/ranks/silver_2.png';
import silver3 from '../assets/ranks/silver_3.png';
import silver4 from '../assets/ranks/silver_4.png';
import silverElite from '../assets/ranks/silver_elite.png';
import silverEliteMaster from '../assets/ranks/silver_elite_master.png';
import goldNova1 from '../assets/ranks/gold_nova_1.png';
import goldNova2 from '../assets/ranks/gold_nova_2.png';
import goldNova3 from '../assets/ranks/gold_nova_3.png';
import goldNovaMaster from '../assets/ranks/gold_nova_master.png';
import masterGuardian1 from '../assets/ranks/master_guardian_1.png';
import masterGuardian2 from '../assets/ranks/master_guardian_2.png';
import masterGuardianElite from '../assets/ranks/master_guardian_elite.png';
import distinguishedMasterGuardian from '../assets/ranks/distinguished_master_guardian.png';
import legendaryEagle from '../assets/ranks/legendary_eagle.png';
import legendaryEagleMaster from '../assets/ranks/legendary_eagle_master.png';
import supremeMasterFirstClass from '../assets/ranks/supreme_master_first_class.png';
import globalElite from '../assets/ranks/global_elite.png';

export const getCsgoRank = (total: number) => {
  if (total >= 10000) return { title: 'The Global Elite', short: 'GE', image: globalElite, color: 'from-blue-400 to-cyan-500', next: null, target: null };
  if (total >= 8000) return { title: 'Supreme Master First Class', short: 'Supreme', image: supremeMasterFirstClass, color: 'from-teal-400 to-emerald-500', next: 'The Global Elite', target: 10000 };
  if (total >= 6500) return { title: 'Legendary Eagle Master', short: 'LEM', image: legendaryEagleMaster, color: 'from-fuchsia-500 to-purple-600', next: 'Supreme Master First Class', target: 8000 };
  if (total >= 5200) return { title: 'Legendary Eagle', short: 'LE', image: legendaryEagle, color: 'from-purple-500 to-pink-500', next: 'Legendary Eagle Master', target: 6500 };
  if (total >= 4200) return { title: 'Distinguished Master Guardian', short: 'DMG', image: distinguishedMasterGuardian, color: 'from-rose-400 to-red-500', next: 'Legendary Eagle', target: 5200 };
  if (total >= 3300) return { title: 'Master Guardian Elite', short: 'MGE', image: masterGuardianElite, color: 'from-red-500 to-orange-500', next: 'Distinguished Master Guardian', target: 4200 };
  if (total >= 2600) return { title: 'Master Guardian II', short: 'MG2', image: masterGuardian2, color: 'from-orange-400 to-amber-500', next: 'Master Guardian Elite', target: 3300 };
  if (total >= 2000) return { title: 'Master Guardian I', short: 'MG1', image: masterGuardian1, color: 'from-amber-400 to-orange-500', next: 'Master Guardian II', target: 2600 };
  if (total >= 1500) return { title: 'Gold Nova Master', short: 'GNM', image: goldNovaMaster, color: 'from-yellow-400 to-amber-400', next: 'Master Guardian I', target: 2000 };
  if (total >= 1100) return { title: 'Gold Nova III', short: 'GN3', image: goldNova3, color: 'from-yellow-300 to-yellow-400', next: 'Gold Nova Master', target: 1500 };
  if (total >= 800) return { title: 'Gold Nova II', short: 'GN2', image: goldNova2, color: 'from-yellow-200 to-yellow-300', next: 'Gold Nova III', target: 1100 };
  if (total >= 600) return { title: 'Gold Nova I', short: 'GN1', image: goldNova1, color: 'from-yellow-100 to-yellow-200', next: 'Gold Nova II', target: 800 };
  if (total >= 400) return { title: 'Silver Elite Master', short: 'SEM', image: silverEliteMaster, color: 'from-slate-400 to-gray-500', next: 'Gold Nova I', target: 600 };
  if (total >= 250) return { title: 'Silver Elite', short: 'SE', image: silverElite, color: 'from-slate-300 to-gray-400', next: 'Silver Elite Master', target: 400 };
  if (total >= 150) return { title: 'Silver IV', short: 'S4', image: silver4, color: 'from-slate-200 to-gray-300', next: 'Silver Elite', target: 250 };
  if (total >= 100) return { title: 'Silver III', short: 'S3', image: silver3, color: 'from-gray-300 to-gray-400', next: 'Silver IV', target: 150 };
  if (total >= 50) return { title: 'Silver II', short: 'S2', image: silver2, color: 'from-gray-400 to-gray-500', next: 'Silver III', target: 100 };
  return { title: 'Silver I', short: 'S1', image: silver1, color: 'from-gray-500 to-slate-600', next: 'Silver II', target: 50 };
};

export const RANK_GROUPS = [
  {
    name: 'Silver',
    description: 'Boshlang\'ich Kadrlarni Kengaytirish',
    color: 'text-gray-300 border-gray-400',
    ranks: [
      { id: 1, title: 'Silver I', xp: 0, image: silver1 },
      { id: 2, title: 'Silver II', xp: 50, image: silver2 },
      { id: 3, title: 'Silver III', xp: 100, image: silver3 },
      { id: 4, title: 'Silver IV', xp: 150, image: silver4 },
      { id: 5, title: 'Silver Elite', xp: 250, image: silverElite },
      { id: 6, title: 'Silver Elite Master', xp: 400, image: silverEliteMaster },
    ]
  },
  {
    name: 'Gold Nova',
    description: 'Stabil Mutaxassislar (O\'rta level)',
    color: 'text-amber-400 border-amber-500',
    ranks: [
      { id: 7, title: 'Gold Nova I', xp: 600, image: goldNova1 },
      { id: 8, title: 'Gold Nova II', xp: 800, image: goldNova2 },
      { id: 9, title: 'Gold Nova III', xp: 1100, image: goldNova3 },
      { id: 10, title: 'Gold Nova Master', xp: 1500, image: goldNovaMaster },
    ]
  },
  {
    name: 'Master Guardian',
    description: 'Ishonchli va Tajribali Xodimlar',
    color: 'text-orange-500 border-orange-500',
    ranks: [
      { id: 11, title: 'Master Guardian I', xp: 2000, image: masterGuardian1 },
      { id: 12, title: 'Master Guardian II', xp: 2600, image: masterGuardian2 },
      { id: 13, title: 'Master Guardian Elite', xp: 3300, image: masterGuardianElite },
      { id: 14, title: 'Distinguished Master Guardian', xp: 4200, image: distinguishedMasterGuardian },
    ]
  },
  {
    name: 'The Elite',
    description: 'Kompaniya Faxrlari (Top 1%)',
    color: 'text-purple-400 border-fuchsia-500',
    ranks: [
      { id: 15, title: 'Legendary Eagle', xp: 5200, image: legendaryEagle },
      { id: 16, title: 'Legendary Eagle Master', xp: 6500, image: legendaryEagleMaster },
      { id: 17, title: 'Supreme Master First Class', xp: 8000, image: supremeMasterFirstClass },
      { id: 18, title: 'The Global Elite', xp: 10000, image: globalElite },
    ]
  }
];
