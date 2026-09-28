import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

/**
 * Dashboard'dagi doira/ustun diagrammalari uchun umumiy chart.js sozlamasi.
 * Oldin bular ApexCharts'da edi — bitta sahifada ikki grafik kutubxonasi yuklanardi.
 *
 * DIQQAT: Profile.tsx datalabels plugin'ini GLOBAL ro'yxatdan o'tkazadi — o'sha sahifa
 * ochilgandan keyin u barcha grafiklarga yoqiladi. Shuning uchun har grafikda
 * `datalabels.display` aniq beriladi.
 */
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export { ChartDataLabels };

export const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(15, 23, 42, 0.9)',
  padding: 10,
  cornerRadius: 10,
  titleFont: { family: 'inherit', weight: 'bold' as const },
  bodyFont: { family: 'inherit' },
};

export const percentOf = (value: number, total: number) =>
  total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
