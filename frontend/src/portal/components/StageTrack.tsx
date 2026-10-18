import type { ShipmentStage } from '../types';

/**
 * Qorong'i (hero) fon ustidagi bosqich yo'li.
 * - `nodes`: nomli aylanalar (kompyuter, hero kartada)
 * - `segments`: ingichka bo'laklar (telefon va ro'yxat kartalarida)
 */

interface NodesProps {
  stages: ShipmentStage[];
}

export function StageNodes({ stages }: NodesProps) {
  return (
    <ol aria-label="Yuk bosqichlari" className="m-0 flex list-none p-0">
      {stages.map((s, i) => {
        const done = s.state === 'DONE';
        const current = s.state === 'CURRENT';
        const reached = done || current;
        return (
          <li key={s.id} className="flex min-w-0 flex-1 flex-col items-center gap-3">
            <div className="flex w-full items-center">
              <div className={`h-1 flex-1 rounded-sm ${i === 0 ? 'bg-transparent' : reached ? 'bg-white' : 'bg-white/30'}`} />
              <div
                aria-current={current ? 'step' : undefined}
                className={`flex shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${
                  current ? 'pulse-ring size-11' : 'size-8'
                } ${reached ? 'border-white bg-white text-p-hero' : 'border-white/40 bg-transparent text-white/75'}`}
              >
                {done ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                ) : (
                  i + 1
                )}
              </div>
              <div className={`h-1 flex-1 rounded-sm ${i === stages.length - 1 ? 'bg-transparent' : done ? 'bg-white' : 'bg-white/30'}`} />
            </div>
            <div
              className={`line-clamp-2 px-0.5 text-center text-sm leading-tight ${
                current ? 'font-bold text-white' : done ? 'font-medium text-white/90' : 'font-medium text-white/65'
              }`}
            >
              {s.name}
              <span className="sr-only">{done ? ' (bajarilgan)' : current ? ' (hozir)' : ' (kutilmoqda)'}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

interface SegmentsProps {
  total: number;
  done: number;
  /** Rang: hero fonida oq, kartada holat rangi */
  tone?: 'hero' | 'amber' | 'green' | 'gray';
  size?: 'md' | 'sm';
}

const TONES = {
  hero: { on: 'bg-white', rest: 'bg-white/30', half: 'linear-gradient(90deg,#fff 50%,rgba(255,255,255,.3) 50%)' },
  amber: { on: 'bg-p-amber', rest: 'bg-p-line', half: 'linear-gradient(90deg,var(--p-amber) 50%,var(--p-line) 50%)' },
  green: { on: 'bg-p-green', rest: 'bg-p-line', half: 'linear-gradient(90deg,var(--p-green) 50%,var(--p-line) 50%)' },
  gray: { on: 'bg-p-gray', rest: 'bg-p-line', half: 'linear-gradient(90deg,var(--p-gray) 50%,var(--p-line) 50%)' },
} as const;

export function StageSegments({ total, done, tone = 'amber', size = 'md' }: SegmentsProps) {
  const t = TONES[tone];
  const h = size === 'md' ? 'h-2' : 'h-1.5';
  const allDone = total > 0 && done >= total;
  return (
    <div aria-hidden="true" className="flex gap-1">
      {Array.from({ length: total }, (_, i) => {
        const isDone = i < done;
        const isCurrent = !allDone && i === done;
        return (
          <div
            key={i}
            className={`${h} flex-1 rounded ${isDone ? t.on : isCurrent ? '' : t.rest}`}
            style={isCurrent ? { background: t.half } : undefined}
          />
        );
      })}
    </div>
  );
}
