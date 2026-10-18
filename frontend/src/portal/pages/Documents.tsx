import { useMemo, useState } from 'react';
import { portalApi } from '../lib/portalApi';
import { useFetch } from '../lib/useFetch';
import DocumentRow from '../components/DocumentRow';
import { EmptyState, ErrorBox, Spinner } from '../components/ui';
import type { PortalDocument } from '../types';

export default function Documents() {
  const docs = useFetch(() => portalApi.get<PortalDocument[]>('/documents').then((r) => r.data), []);
  const [selected, setSelected] = useState<number | 'all'>('all');
  const [query, setQuery] = useState('');

  const all = docs.data ?? [];

  const shipments = useMemo(() => {
    const map = new Map<number, string>();
    for (const d of all) if (!map.has(d.shipmentId)) map.set(d.shipmentId, d.shipmentTitle);
    return [...map.entries()].map(([id, title]) => ({ id, title }));
  }, [all]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = all.filter((d) =>
      (selected === 'all' || d.shipmentId === selected) &&
      (!q || d.name.toLowerCase().includes(q) || d.shipmentTitle.toLowerCase().includes(q) || String(d.shipmentId).includes(q)),
    );
    const byShipment = new Map<number, PortalDocument[]>();
    for (const d of filtered) {
      const arr = byShipment.get(d.shipmentId) ?? [];
      arr.push(d);
      byShipment.set(d.shipmentId, arr);
    }
    return [...byShipment.entries()].map(([id, items]) => ({ id, title: items[0].shipmentTitle, items }));
  }, [all, selected, query]);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[13px] text-p-muted md:text-sm">Barcha yuklar bo'yicha</div>
          <h1 className="m-0 text-[26px] font-extrabold leading-tight tracking-tight md:text-[34px]">Hujjatlar</h1>
        </div>
        <div className="flex w-full flex-col gap-1.5 md:w-[360px]">
          <label htmlFor="doc-search" className="text-[13px] font-semibold text-p-muted max-md:sr-only">Qidirish</label>
          <input
            id="doc-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hujjat nomi yoki yuk raqami"
            className="h-[52px] rounded-2xl border-[1.5px] border-p-line bg-p-card px-4 text-base text-p-ink placeholder:text-p-muted/70"
          />
        </div>
      </header>

      {docs.loading && !docs.data ? (
        <Spinner />
      ) : docs.error ? (
        <ErrorBox message={docs.error} onRetry={docs.reload} />
      ) : all.length === 0 ? (
        <EmptyState icon="solar:document-text-bold-duotone" title="Hujjatlar hali yo'q" text="Invoys, ST-1, CMR va boshqa hujjatlar tayyor bo'lgach shu yerda paydo bo'ladi." />
      ) : (
        <>
          {shipments.length > 1 && (
            <div role="group" aria-label="Yuk bo'yicha saralash" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
              {[{ id: 'all' as const, label: 'Hammasi' }, ...shipments.map((s) => ({ id: s.id, label: `№ ${s.id}` }))].map((c) => {
                const on = selected === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSelected(c.id)}
                    className={`h-11 shrink-0 rounded-full border px-4 text-sm font-semibold md:px-4.5 md:text-[15px] ${
                      on ? 'border-p-brand bg-p-brand text-p-brand-ink' : 'border-p-line bg-p-card text-p-ink'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          )}

          {groups.length === 0 ? (
            <EmptyState icon="solar:magnifer-bold-duotone" title="Hech narsa topilmadi" text="Qidiruv so'zini o'zgartirib ko'ring." />
          ) : (
            <div className="flex flex-col gap-4 md:gap-5">
              {groups.map((g) => (
                <section key={g.id} aria-labelledby={`g-${g.id}`} className="overflow-hidden rounded-[18px] border border-p-line bg-p-card md:rounded-[20px]">
                  <div className="border-b border-p-line px-4 py-3.5 md:px-6 md:py-4.5">
                    <h2 id={`g-${g.id}`} className="m-0 text-base font-bold leading-tight md:text-[19px]">{g.title}</h2>
                    <div className="mt-0.5 text-xs text-p-muted md:text-[13px]">
                      <span className="font-mono">№ {g.id}</span> · {g.items.length} ta hujjat
                    </div>
                  </div>
                  <div className="px-4 md:px-6">
                    {g.items.map((doc) => <DocumentRow key={doc.id} doc={doc} />)}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
