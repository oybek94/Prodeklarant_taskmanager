import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { StatusBadge } from '../invoices/helpers';
import type { ClientDetail } from './ClientOverview';

export interface MonthlyTaskCount {
  month: string;
  count: number;
  year?: number;
  monthIndex?: number;
}

interface ClientTasksTabProps {
  tasks: ClientDetail['tasks'];
  monthly: MonthlyTaskCount[];
  onOpenTask: (taskId: number) => void;
}

const PAGE_SIZE = 20;

const ClientTasksTab = ({ tasks, monthly, onOpenTask }: ClientTasksTabProps) => {
  const [month, setMonth] = useState<{ year: number; monthIndex: number; label: string } | null>(null);
  const [branch, setBranch] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const branches = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tasks) {
      const name = t.branch?.name || 'Filialsiz';
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [tasks]);

  const filtered = useMemo(
    () =>
      tasks.filter((t) => {
        if (branch && (t.branch?.name || 'Filialsiz') !== branch) return false;
        if (month) {
          const d = new Date(t.createdAt);
          if (d.getFullYear() !== month.year || d.getMonth() !== month.monthIndex) return false;
        }
        return true;
      }),
    [tasks, branch, month],
  );

  const resetPaging = () => setVisible(PAGE_SIZE);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
        <Icon icon="solar:inbox-bold-duotone" className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Hali ishlar yo'q</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {monthly.length > 0 && (
        <MonthlyChart
          monthly={monthly}
          selected={month}
          onSelect={(m) => {
            setMonth(m);
            resetPaging();
          }}
        />
      )}

      {branches.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <Chip active={branch === null} onClick={() => { setBranch(null); resetPaging(); }}>
            Barchasi <span className="tabular-nums opacity-70">{tasks.length}</span>
          </Chip>
          {branches.map(([name, count]) => (
            <Chip key={name} active={branch === name} onClick={() => { setBranch(name); resetPaging(); }}>
              {name} <span className="tabular-nums opacity-70">{count}</span>
            </Chip>
          ))}
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-slate-800/80 border-b border-gray-100 dark:border-slate-700/60 text-xs text-gray-500 dark:text-gray-400">
          <span>
            {month ? `${month.label}: ` : ''}
            <span className="font-semibold text-gray-700 dark:text-gray-200 tabular-nums">{filtered.length}</span> ta ish
          </span>
          {(month || branch) && (
            <button
              type="button"
              onClick={() => { setMonth(null); setBranch(null); resetPaging(); }}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Filtrni tozalash
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Tanlangan filtr bo'yicha ishlar yo'q</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-slate-700/60">
            {filtered.slice(0, visible).map((task) => (
              <li
                key={task.id}
                onClick={() => onOpenTask(task.id)}
                className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800/60 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={task.title}>
                    {task.title || `Ish #${task.id}`}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 tabular-nums">
                    <span>#{task.id}</span>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span>{task.branch?.name || 'Filialsiz'}</span>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span>{new Date(task.createdAt).toLocaleDateString('uz-UZ')}</span>
                    {task.hasPsr && (
                      <span className="ml-1 px-1.5 py-px rounded bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-medium">PSR</span>
                    )}
                  </div>
                </div>
                <StatusBadge
                  status={task.status}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTask(task.id);
                  }}
                />
              </li>
            ))}
          </ul>
        )}

        {filtered.length > visible && (
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="w-full py-2.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800/60 hover:bg-gray-50 dark:hover:bg-slate-800 border-t border-gray-100 dark:border-slate-700/60"
          >
            Yana ko'rsatish ({filtered.length - visible} ta qoldi)
          </button>
        )}
      </section>
    </div>
  );
};

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-7 px-2.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 ${
        active
          ? 'bg-blue-600 border-blue-600 text-white'
          : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-slate-600'
      }`}
    >
      {children}
    </button>
  );
}

function MonthlyChart({
  monthly,
  selected,
  onSelect,
}: {
  monthly: MonthlyTaskCount[];
  selected: { year: number; monthIndex: number } | null;
  onSelect: (m: { year: number; monthIndex: number; label: string } | null) => void;
}) {
  const max = Math.max(...monthly.map((m) => m.count), 1);
  const total = monthly.reduce((s, m) => s + m.count, 0);

  return (
    <section className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-5 pt-4 pb-3">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Oxirgi 12 oy</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{total}</span> ta ish · ustunni bosib filtrlang
        </span>
      </div>
      <div className="flex items-end gap-1.5 h-28">
        {monthly.map((m) => {
          const isSelected = selected?.year === m.year && selected?.monthIndex === m.monthIndex;
          const dimmed = selected !== null && !isSelected;
          const canSelect = m.year !== undefined && m.monthIndex !== undefined && m.count > 0;
          return (
            <button
              key={`${m.year}-${m.monthIndex}`}
              type="button"
              disabled={!canSelect}
              title={`${m.month}: ${m.count} ta`}
              onClick={() => {
                if (!canSelect) return;
                onSelect(isSelected ? null : { year: m.year!, monthIndex: m.monthIndex!, label: m.month });
              }}
              className="group flex-1 h-full flex flex-col justify-end items-center min-w-0 disabled:cursor-default"
            >
              <span className={`text-[10px] tabular-nums mb-0.5 ${m.count > 0 ? 'text-gray-500 dark:text-gray-400' : 'text-transparent'}`}>
                {m.count}
              </span>
              <span
                className={`w-full rounded-t-md transition-colors ${
                  isSelected
                    ? 'bg-blue-600'
                    : dimmed
                      ? 'bg-indigo-100 dark:bg-indigo-900/30'
                      : 'bg-indigo-300 dark:bg-indigo-600/70 group-enabled:group-hover:bg-indigo-500'
                }`}
                style={{ height: `${(m.count / max) * 100}%`, minHeight: m.count > 0 ? 3 : 1 }}
              />
            </button>
          );
        })}
      </div>
      <div className="flex gap-1.5 mt-1.5 border-t border-gray-100 dark:border-slate-700/60 pt-1.5">
        {monthly.map((m) => (
          <span key={`${m.year}-${m.monthIndex}`} className="flex-1 text-center text-[10px] text-gray-400 dark:text-gray-500 truncate">
            {m.month.substring(0, 3)}
          </span>
        ))}
      </div>
    </section>
  );
}

export default ClientTasksTab;
