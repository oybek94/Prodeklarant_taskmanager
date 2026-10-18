import { Icon } from '@iconify/react';
import type { ShipmentStatus } from '../types';

export const STATUS_META: Record<ShipmentStatus, { label: string; pill: string; tone: 'amber' | 'green' | 'gray' }> = {
  IN_PROGRESS: { label: 'Jarayonda', pill: 'bg-p-amber-bg text-p-amber-fg', tone: 'amber' },
  READY: { label: 'Tayyor', pill: 'bg-p-green-bg text-p-green-fg', tone: 'green' },
  COMPLETED: { label: 'Yakunlangan', pill: 'bg-p-gray-bg text-p-gray-fg', tone: 'gray' },
};

export function StatusPill({ status }: { status: ShipmentStatus }) {
  const m = STATUS_META[status];
  return <span className={`shrink-0 rounded-full px-3 py-1 text-[13px] font-bold ${m.pill}`}>{m.label}</span>;
}

export function Spinner({ label = 'Yuklanmoqda…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-p-muted">
      <Icon icon="solar:refresh-circle-bold-duotone" width="28" className="animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl bg-p-red-bg p-5 text-p-red-fg">
      <div className="flex items-start gap-3">
        <Icon icon="solar:danger-circle-bold-duotone" width="24" className="mt-0.5 shrink-0" aria-hidden="true" />
        <span className="text-[15px] font-medium">{message}</span>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="h-11 rounded-xl bg-p-card px-5 text-[15px] font-bold text-p-ink">
          Qayta urinish
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, text }: { icon: string; title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-p-line px-6 py-12 text-center">
      <Icon icon={icon} width="40" className="text-p-muted" aria-hidden="true" />
      <div className="text-[17px] font-bold">{title}</div>
      {text && <div className="max-w-sm text-[15px] text-p-muted">{text}</div>}
    </div>
  );
}
