import type { ReactNode } from 'react';
import { StageNodes, StageSegments } from './StageTrack';
import { STATUS_META } from './ui';
import { formatDate, formatRelative } from '../format';
import type { ShipmentDetail, ShipmentListItem } from '../types';

interface Props {
  /** Batafsil ma'lumot (bosqich nomlari bilan); hali yuklanmagan bo'lsa ro'yxat elementi bilan chiziladi */
  summary: ShipmentListItem | ShipmentDetail;
  detail: ShipmentDetail | null;
  actions?: ReactNode;
  headingLevel?: 'h1' | 'h2';
}

export default function ShipmentHero({ summary, detail, actions, headingLevel = 'h2' }: Props) {
  const Heading = headingLevel;
  const s = detail ?? summary;
  const current = detail?.stages.find((st) => st.state === 'CURRENT') ?? null;
  const stageName = s.currentStage?.name ?? 'Boshlanmagan';
  const meta = STATUS_META[s.status];

  return (
    <section aria-labelledby={`hero-${s.id}`} className="flex flex-col gap-6 rounded-3xl bg-p-hero p-5 text-white md:gap-8 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 text-[13px] text-white/80 md:text-sm">
            <span className="font-mono">№ {s.id}</span>
            {s.branchName && <><span aria-hidden="true">·</span><span>{s.branchName}</span></>}
            <span aria-hidden="true">·</span>
            <span>{formatDate(s.createdAt)}</span>
          </div>
          <Heading id={`hero-${s.id}`} className="m-0 mt-1.5 text-[25px] font-extrabold leading-[1.1] tracking-tight md:mt-2 md:text-[38px]">
            {s.title}
          </Heading>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-2 text-[13px] font-medium md:text-sm">
          <span aria-hidden="true" className={`size-2 rounded-full ${s.status === 'IN_PROGRESS' ? 'bg-[#7BE3A0]' : 'bg-white'}`} />
          {meta.label} · {formatRelative(s.updatedAt)}
        </div>
      </div>

      {detail && detail.stages.length > 0 ? (
        <>
          <div className="hidden md:block"><StageNodes stages={detail.stages} /></div>
          <div className="md:hidden"><StageSegments total={s.totalStages} done={s.doneStages} tone="hero" /></div>
        </>
      ) : (
        <StageSegments total={s.totalStages} done={s.doneStages} tone="hero" />
      )}

      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0 flex-1 basis-80">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/70 md:text-[13px]">
            {s.status === 'COMPLETED' ? 'Yakunlangan' : s.status === 'READY' ? 'Tayyor' : `Hozir · ${s.currentStage?.index ?? 0} / ${s.totalStages}`}
          </div>
          <div className="mt-1 text-xl font-bold leading-tight tracking-tight md:text-[26px]">{stageName}</div>
          {current?.assigneeName && <div className="mt-1.5 text-sm text-white/85 md:text-[15px]">Mas'ul: {current.assigneeName}</div>}
        </div>
        {actions && <div className="grid w-full grid-cols-2 gap-2.5 md:flex md:w-auto md:gap-3">{actions}</div>}
      </div>
    </section>
  );
}
