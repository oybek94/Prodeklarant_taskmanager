import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { usePortalAuth } from '../context/PortalAuthContext';
import { portalApi } from '../lib/portalApi';
import { useFetch } from '../lib/useFetch';
import { formatRelative } from '../format';
import ShipmentHero from '../components/ShipmentHero';
import { StageSegments } from '../components/StageTrack';
import { EmptyState, ErrorBox, Spinner, STATUS_META, StatusPill } from '../components/ui';
import type { ShipmentDetail, ShipmentListItem, ShipmentStatus } from '../types';

const TABS: Array<{ key: ShipmentStatus; label: string }> = [
  { key: 'IN_PROGRESS', label: 'Faol' },
  { key: 'READY', label: 'Tayyor' },
  { key: 'COMPLETED', label: 'Arxiv' },
];

const EMPTY_TEXT: Record<ShipmentStatus, string> = {
  IN_PROGRESS: 'Hozir jarayonda yuk yo\'q',
  READY: 'Olib ketishga tayyor yuk yo\'q',
  COMPLETED: 'Yakunlangan yuklar hali yo\'q',
};

function ShipmentRow({ item }: { item: ShipmentListItem }) {
  const tone = STATUS_META[item.status].tone;
  const stageText = item.status === 'COMPLETED'
    ? 'Yakunlangan'
    : `${item.currentStage?.name ?? 'Boshlanmagan'} · ${item.currentStage?.index ?? 0}/${item.totalStages}`;
  return (
    <Link
      to={`/shipments/${item.id}`}
      className="flex min-h-[88px] flex-col gap-2.5 rounded-2xl border border-p-line bg-p-card p-4 md:flex-row md:items-center md:gap-7 md:rounded-[18px] md:px-5.5 md:py-4.5"
    >
      <div className="flex items-start justify-between gap-2.5 md:block md:flex-[1_1_240px] md:min-w-0">
        <div className="min-w-0">
          <div className="text-base font-bold leading-tight tracking-tight md:text-lg">{item.title}</div>
          <div className="mt-0.5 text-xs text-p-muted md:text-[13px]">
            <span className="font-mono">№ {item.id}</span> · {formatRelative(item.updatedAt)}
          </div>
        </div>
        <div className="md:hidden"><StatusPill status={item.status} /></div>
      </div>
      <div className="md:flex-[1_1_280px] md:min-w-0">
        <StageSegments total={item.totalStages} done={item.doneStages} tone={tone} size="sm" />
        <div className="mt-2 truncate text-[13px] font-medium md:text-sm">{stageText}</div>
      </div>
      <div className="hidden items-center gap-3 md:flex">
        <StatusPill status={item.status} />
        <Icon icon="solar:alt-arrow-right-bold-duotone" width="20" className="text-p-muted" aria-hidden="true" />
      </div>
    </Link>
  );
}

export default function Shipments() {
  const { client } = usePortalAuth();
  const [tab, setTab] = useState<ShipmentStatus>('IN_PROGRESS');
  const list = useFetch(() => portalApi.get<ShipmentListItem[]>('/shipments').then((r) => r.data), []);

  const items = list.data ?? [];
  const hero = items.find((i) => i.status === 'IN_PROGRESS') ?? null;
  const readyItems = items.filter((i) => i.status === 'READY');
  const ready = readyItems[0] ?? null;

  const heroDetail = useFetch<ShipmentDetail | null>(
    () => (hero ? portalApi.get<ShipmentDetail>(`/shipments/${hero.id}`).then((r) => r.data) : Promise.resolve(null)),
    [hero?.id],
  );

  const counts = (key: ShipmentStatus) => items.filter((i) => i.status === key).length;
  const rows = items.filter((i) => i.status === tab);

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <header>
        <div className="text-[13px] text-p-muted md:text-sm">{client?.name}</div>
        <h1 className="m-0 text-[26px] font-extrabold leading-tight tracking-tight md:text-[34px]">Yuklarim</h1>
      </header>

      {list.loading && !list.data ? (
        <Spinner />
      ) : list.error ? (
        <ErrorBox message={list.error} onRetry={list.reload} />
      ) : items.length === 0 ? (
        <EmptyState icon="solar:delivery-bold-duotone" title="Hozircha yuklar yo'q" text="Yangi yuk ochilganda shu yerda ko'rinadi. Savollar bo'lsa mas'ul xodimingizga qo'ng'iroq qiling." />
      ) : (
        <>
          {ready && (
            <Link
              to={`/shipments/${ready.id}`}
              className="flex min-h-16 flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl bg-p-green-bg p-3.5 text-p-green-fg md:rounded-[18px] md:px-5 md:py-4"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-p-green text-white md:size-11">
                <Icon icon="solar:check-circle-bold-duotone" width="26" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 basis-60">
                <span className="block text-[15px] font-bold leading-tight md:text-[17px]">
                  {ready.title} — olib ketishga tayyor
                </span>
                <span className="block text-[13px] md:text-sm">
                  {readyItems.length > 1 ? `Yana ${readyItems.length - 1} ta yuk tayyor. ` : ''}Hujjatlarni ko'rish
                </span>
              </span>
              <Icon icon="solar:alt-arrow-right-bold-duotone" width="20" aria-hidden="true" />
            </Link>
          )}

          {hero && (
            <ShipmentHero
              summary={hero}
              detail={heroDetail.data}
              actions={
                <>
                  <Link to={`/shipments/${hero.id}#documents`} className="flex h-[52px] items-center justify-center gap-2.5 rounded-[14px] bg-white px-5 text-[15px] font-bold text-p-hero md:px-5.5 md:text-base">
                    <Icon icon="solar:document-text-bold-duotone" width="22" aria-hidden="true" />
                    Hujjatlar{hero.documentCount > 0 ? ` (${hero.documentCount})` : ''}
                  </Link>
                  <Link to={`/shipments/${hero.id}`} className="flex h-[52px] items-center justify-center gap-1.5 rounded-[14px] border-2 border-white/55 px-5 text-[15px] font-bold text-white md:text-base">
                    Batafsil
                    <Icon icon="solar:alt-arrow-right-bold-duotone" width="18" aria-hidden="true" />
                  </Link>
                </>
              }
            />
          )}

          <section aria-labelledby="all-shipments" className="flex flex-col gap-3 md:gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="all-shipments" className="m-0 text-xl font-bold tracking-tight md:text-[22px]">Barcha ishlar</h2>
              <div role="group" aria-label="Holat bo'yicha saralash" className="grid w-full grid-cols-3 gap-1 rounded-[14px] bg-p-gray-bg p-1 md:flex md:w-auto">
                {TABS.map((t) => {
                  const on = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setTab(t.key)}
                      className={`h-11 rounded-[10px] px-4.5 text-sm font-semibold md:text-[15px] ${on ? 'bg-p-card text-p-ink shadow-sm' : 'text-p-muted'}`}
                    >
                      {t.label} <span className="font-medium opacity-75">{counts(t.key)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {rows.length === 0 ? (
              <EmptyState icon="solar:box-bold-duotone" title={EMPTY_TEXT[tab]} />
            ) : (
              <div className="flex flex-col gap-2.5">
                {rows.map((item) => <ShipmentRow key={item.id} item={item} />)}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
