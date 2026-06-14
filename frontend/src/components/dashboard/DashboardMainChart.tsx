import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartData } from '../../types/dashboard';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);
interface DashboardMainChartProps {
  chartData: ChartData | null;
  period: 'weekly' | 'monthly' | 'yearly';
  setPeriod: (period: 'weekly' | 'monthly' | 'yearly') => void;
}

export const DashboardMainChart: React.FC<DashboardMainChartProps> = ({
  chartData,
  period,
  setPeriod,
}) => {
  const chartDataWithLabels = useMemo(() => {
    if (!chartData?.tasksCompleted || !chartData?.dateRange) {
      return { labels: [], current: [], previous: [] };
    }

    const startDate = new Date(chartData.dateRange.start);
    const endDate = new Date(chartData.dateRange.end);
    const previousTasks = chartData.previousTasksCompleted || [];

    const labels: string[] = [];
    const current: number[] = [];
    const previous: number[] = [];

    if (period === 'weekly') {
      const weekDays = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];
      const currentByWeekday = Array.from({ length: 7 }, () => 0);
      const previousByWeekday = Array.from({ length: 7 }, () => 0);

      chartData.tasksCompleted.forEach((item) => {
        const date = new Date(item.date);
        const dayIndex = (date.getDay() + 6) % 7;
        currentByWeekday[dayIndex] += 1;
      });
      previousTasks.forEach((item) => {
        const date = new Date(item.date);
        const dayIndex = (date.getDay() + 6) % 7;
        previousByWeekday[dayIndex] += 1;
      });

      const cursor = new Date(startDate);
      while (cursor <= endDate) {
        const dayIndex = (cursor.getDay() + 6) % 7;
        labels.push(weekDays[dayIndex]);
        current.push(currentByWeekday[dayIndex] || 0);
        previous.push(previousByWeekday[dayIndex] || 0);
        cursor.setDate(cursor.getDate() + 1);
      }
    } else if (period === 'monthly') {
      const monthShort = ['yan.', 'fev.', 'mar.', 'apr.', 'may', 'iyun', 'iyul', 'avg.', 'sen.', 'okt.', 'noy.', 'dek.'];
      const currentByDay = new Map<number, number>();
      const previousByDay = new Map<number, number>();

      chartData.tasksCompleted.forEach((item) => {
        const date = new Date(item.date);
        currentByDay.set(date.getDate(), (currentByDay.get(date.getDate()) || 0) + 1);
      });
      previousTasks.forEach((item) => {
        const date = new Date(item.date);
        previousByDay.set(date.getDate(), (previousByDay.get(date.getDate()) || 0) + 1);
      });

      const cursor = new Date(startDate);
      while (cursor <= endDate) {
        const day = cursor.getDate();
        labels.push(`${day} ${monthShort[cursor.getMonth()]}`);
        current.push(currentByDay.get(day) || 0);
        previous.push(previousByDay.get(day) || 0);
        cursor.setDate(cursor.getDate() + 1);
      }
    } else if (period === 'yearly') {
      const monthNames = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];
      const targetYear = startDate.getFullYear();
      const endMonth = endDate.getMonth();
      const currentByMonth = Array.from({ length: 12 }, () => 0);
      const previousByMonth = Array.from({ length: 12 }, () => 0);

      chartData.tasksCompleted.forEach((item) => {
        const date = new Date(item.date);
        if (date.getFullYear() === targetYear) {
          currentByMonth[date.getMonth()] += 1;
        }
      });
      previousTasks.forEach((item) => {
        const date = new Date(item.date);
        previousByMonth[date.getMonth()] += 1;
      });

      for (let month = 0; month <= endMonth; month++) {
        labels.push(monthNames[month]);
        current.push(currentByMonth[month] || 0);
        previous.push(previousByMonth[month] || 0);
      }
    }

    return { labels, current, previous };
  }, [chartData, period]);

  return (
    <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-[1.5px] border-white/80 dark:border-white/10 p-5 sm:p-6 lg:p-8 flex flex-col h-[420px] transition-all duration-300 overflow-hidden group">
      
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-[40rem] h-[40rem] bg-gradient-to-br from-indigo-400/10 via-purple-400/5 to-transparent rounded-full blur-3xl pointer-events-none opacity-60 transition-opacity group-hover:opacity-100"></div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shrink-0 relative z-10">
        <div className="flex flex-col">
          <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">Oylik monitoring</h2>
          <p className="text-[10px] font-black tracking-widest text-gray-400 dark:text-gray-500 uppercase mt-1">Bajarilgan vazifalar dinamikasi</p>
        </div>
        <div className="flex gap-1.5 sm:gap-2 bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-xl backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
          <button
            onClick={() => setPeriod('weekly')}
            className={`px-4 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all duration-300 ${period === 'weekly'
              ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-600/50'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
              }`}
          >
            Haftalik
          </button>
          <button
            onClick={() => setPeriod('monthly')}
            className={`px-4 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all duration-300 ${period === 'monthly'
              ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-600/50'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
              }`}
          >
            Oylik
          </button>
          <button
            onClick={() => setPeriod('yearly')}
            className={`px-4 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all duration-300 ${period === 'yearly'
              ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-600/50'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
              }`}
          >
            Yillik
          </button>
        </div>
      </div>

      {/* Charts.js Line Chart */}
      {chartDataWithLabels.labels.length > 0 ? (
        <div className="flex-1 w-full min-h-0 relative z-10">
          <Line
            data={{
              labels: chartDataWithLabels.labels,
              datasets: [
                {
                  label: 'Joriy davr',
                  data: chartDataWithLabels.current,
                  borderColor: 'rgb(99, 102, 241)',
                  backgroundColor: (context: any) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return 'rgba(99, 102, 241, 0.1)';
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
                    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
                    return gradient;
                  },
                  borderWidth: 3,
                  fill: true,
                  tension: 0.4,
                  pointRadius: 4,
                  pointHoverRadius: 6,
                  pointBackgroundColor: 'rgb(99, 102, 241)',
                  pointBorderColor: '#fff',
                  pointBorderWidth: 2,
                  pointHoverBackgroundColor: 'rgb(79, 70, 229)',
                  pointHoverBorderColor: '#fff',
                  yAxisID: 'y',
                },
                {
                  label: 'O‘tgan davr',
                  hidden: true,
                  data: chartDataWithLabels.previous,
                  borderColor: 'rgb(148, 163, 184)',
                  backgroundColor: 'rgba(148, 163, 184, 0.1)',
                  borderWidth: 2,
                  borderDash: [5, 5],
                  fill: false,
                  tension: 0.35,
                  pointRadius: 3,
                  pointHoverRadius: 5,
                  pointBackgroundColor: 'rgb(148, 163, 184)',
                  pointBorderColor: '#fff',
                  pointBorderWidth: 1,
                  yAxisID: 'y1',
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              interaction: {
                mode: 'index' as const,
                intersect: false,
              },
              plugins: {
                legend: {
                  display: true,
                  position: 'top' as const,
                  labels: {
                    font: { family: 'inherit', size: 12, weight: 'bold' },
                    usePointStyle: true,
                    boxWidth: 8,
                    padding: 20,
                  }
                },
                tooltip: {
                  mode: 'index' as const,
                  intersect: false,
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  padding: 12,
                  cornerRadius: 12,
                  titleFont: {
                    size: 14,
                    family: 'inherit',
                    weight: 'bold' as const,
                  },
                  bodyFont: {
                    size: 13,
                    family: 'inherit',
                  },
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderWidth: 1,
                },
              },
              scales: {
                y: {
                  type: 'linear' as const,
                  display: true,
                  position: 'left' as const,
                  beginAtZero: true,
                  border: { display: false },
                  ticks: {
                    stepSize: 1,
                    precision: 0,
                    display: true,
                    font: { family: 'inherit', size: 11, weight: 'bold' },
                    color: '#9ca3af',
                    padding: 10,
                  },
                  grid: {
                    color: 'rgba(0, 0, 0, 0.04)',
                    drawTicks: false,
                  },
                },
                y1: {
                  type: 'linear' as const,
                  display: true,
                  position: 'right' as const,
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1,
                    precision: 0,
                    display: false,
                  },
                  grid: {
                    drawOnChartArea: false,
                  },
                },
                x: {
                  border: { display: false },
                  grid: {
                    display: false,
                    drawTicks: false,
                  },
                  ticks: {
                    maxRotation: period === 'yearly' ? 0 : 45,
                    minRotation: period === 'yearly' ? 0 : 45,
                    font: { family: 'inherit', size: 10, weight: 'bold' },
                    color: '#9ca3af',
                    padding: 10,
                  },
                },
              },
            }}
          />
        </div>
      ) : (
        <div className="w-full flex-1 flex flex-col items-center justify-center text-gray-400">
          <p className="font-bold text-sm">Ma'lumotlar yo'q</p>
        </div>
      )}
    </div>
  );
};
