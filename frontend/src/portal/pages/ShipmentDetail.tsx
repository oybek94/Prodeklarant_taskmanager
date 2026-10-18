import { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { usePortalAuth } from '../context/PortalAuthContext';
import { portalApi } from '../lib/portalApi';
import { useFetch } from '../lib/useFetch';
import { formatDateTime, telHref } from '../format';
import ShipmentHero from '../components/ShipmentHero';
import DocumentRow from '../components/DocumentRow';
import { EmptyState, ErrorBox, Spinner } from '../components/ui';
import type { PortalDocument, ShipmentDetail as Detail, ShipmentStage } from '../types';

function eventOrder(stages: ShipmentStage[]): ShipmentStage[] {
  const done = stages.filter((s) => s.state === 'DONE').sort((a, b) => b.order - a.order);
  const current = stages.filter((s) => s.state === 'CURRENT');
  const pending = stages.filter((s) => s.state === 'PENDING').sort((a, b) => a.order - b.order);
  return [...current, ...done, ...pending];
}

function Timeline({ stages }: { stages: ShipmentStage[] }) {
  return (
    <ol className="m-0 list-none p-0">
      {eventOrder(stages).map((s) => {
        const dot =
          s.state === 'DONE' ? 'border-p-green bg-p-green'
          : s.state === 'CURRENT' ? 'border-p-amber bg-p-amber'
          : 'border-p-gray bg-transparent';
        const when = s.state === 'DONE' && s.completedAt ? formatDateTime(s.completedAt)
          : s.state === 'CURRENT' && s.startedAt ? `Boshlangan: ${formatDateTime(s.startedAt)}`
          : 'Kutilmoqda';
        return (
          <li key={s.id} className="flex gap-3.5 md:gap-4.5">
            <div className="flex w-4 shrink-0 flex-col items-center">
              <div aria-hidden="true" className={`mt-5 size-3.5 rounded-full border-2 md:size-4 ${dot}`} />
              <div aria-hidden="true" className="mt-1 w-0.5 flex-1 bg-p-line" />
            </div>
            <div className="min-w-0 flex-1 pb-3.5 pt-3.5 md:pb-4 md:pt-4.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <div className={`text-[15px] font-semibold leading-snug md:text-[17px] ${s.state === 'PENDING' ? 'text-p-muted' : ''}`}>
                  {s.name}
                  <span className="sr-only">{s.state === 'DONE' ? ' (bajarilgan)' : s.state === 'CURRENT' ? ' (hozir)' : ' (kutilmoqda)'}</span>
                </div>
                <div className="text-[13px] text-p-muted md:text-sm">{when}</div>
              </div>
              {s.assigneeName && s.state !== 'PENDING' && <div className="mt-0.5 text-[13px] text-p-muted md:text-sm">{s.assigneeName}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function ShipmentDetail() {
  const { id } = useParams();
  const location = useLocation();
  const { client } = usePortalAuth();
  const shipmentId = Number(id);

  const detail = useFetch(() => portalApi.get<Detail>(`/shipments/${shipmentId}`).then((r) => r.data), [shipmentId]);
  const docs = useFetch(
    () => portalApi.get<PortalDocument[]>('/documents', { params: { shipmentId } }).then((r) => r.data),
    [shipmentId],
  );

  useEffect(() => {
    if (location.hash === '#documents' && detail.data) {
      document.getElementById('documents')?.scrollIntoView({ block: 'start' });
    }
  }, [location.hash, detail.data]);

  // Backend boshqa mijozning yuki uchun ham 404 "Not found" qaytaradi (apiErrorMessage shu matnni beradi)
  const notFound = !Number.isInteger(shipmentId) || shipmentId <= 0 ||
    (detail.error !== null && /not found/i.test(detail.error));

  const back = (
    <Link to="/" className="mb-3 inline-flex h-11 items-center gap-1.5 pr-3 text-[15px] font-semibold text-p-tint-ink">
      <Icon icon="solar:alt-arrow-left-bold-duotone" width="20" aria-hidden="true" />
      Barcha yuklar
    </Link>
  );

  if (detail.loading && !detail.data) return <div>{back}<Spinner /></div>;
  if (notFound || (!detail.data && !detail.error)) {
    return <div>{back}<EmptyState icon="solar:box-minimalistic-bold-duotone" title="Yuk topilmadi" text="Bu yuk mavjud emas yoki sizga tegishli emas." /></div>;
  }
  if (detail.error || !detail.data) return <div>{back}<ErrorBox message={detail.error ?? 'Xatolik'} onRetry={detail.reload} /></div>;

  const d = detail.data;
  const manager = client?.manager;

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <div>{back}</div>
      <ShipmentHero summary={d} detail={d} headingLevel="h1" />

      <div className="flex flex-col gap-5 md:gap-6 lg:flex-row lg:items-start">
        <section aria-labelledby="timeline" className="min-w-0 rounded-[18px] border border-p-line bg-p-card px-4 pb-1 pt-4 md:rounded-[20px] md:px-8 md:pb-2 md:pt-7 lg:flex-[999_1_560px]">
          <h2 id="timeline" className="m-0 text-lg font-bold tracking-tight md:text-[22px]">Nimalar bo'ldi</h2>
          <Timeline stages={d.stages} />
        </section>

        <div className="flex min-w-0 flex-col gap-5 md:gap-6 lg:flex-[1_1_360px]">
          <section id="documents" aria-labelledby="docs" className="scroll-mt-4 rounded-[18px] border border-p-line bg-p-card px-4 py-4 md:rounded-[20px] md:p-6">
            <div className="flex items-baseline justify-between">
              <h2 id="docs" className="m-0 text-lg font-bold tracking-tight md:text-[22px]">Hujjatlar</h2>
              {docs.data && <span className="text-sm text-p-muted">{docs.data.length} ta</span>}
            </div>
            {docs.loading && !docs.data ? (
              <Spinner />
            ) : docs.error ? (
              <div className="mt-3"><ErrorBox message={docs.error} onRetry={docs.reload} /></div>
            ) : docs.data && docs.data.length > 0 ? (
              <div className="mt-2">{docs.data.map((doc) => <DocumentRow key={doc.id} doc={doc} />)}</div>
            ) : (
              <p className="mt-3 text-[15px] text-p-muted">Hujjatlar tayyor bo'lgach shu yerda paydo bo'ladi.</p>
            )}
          </section>

          <section aria-label="Ma'lumotlar" className="rounded-[18px] border border-p-line bg-p-card px-4 py-4 md:rounded-[20px] md:p-6">
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2.5 text-[15px]">
              {d.driverPhone && (
                <>
                  <dt className="text-p-muted">Haydovchi</dt>
                  <dd className="m-0 text-right font-semibold"><a href={telHref(d.driverPhone)} className="inline-flex min-h-11 items-center">{d.driverPhone}</a></dd>
                </>
              )}
              <dt className="text-p-muted">PSR</dt>
              <dd className="m-0 text-right font-semibold">{d.hasPsr ? 'Bor' : 'Yo\'q'}</dd>
              {d.branchName && (
                <>
                  <dt className="text-p-muted">Filial</dt>
                  <dd className="m-0 text-right font-semibold">{d.branchName}</dd>
                </>
              )}
            </dl>
          </section>

          {manager?.phone && (
            <a
              href={telHref(manager.phone)}
              className="flex min-h-16 items-center justify-between gap-4 rounded-[18px] bg-p-tint p-4 text-p-ink md:rounded-[20px] md:p-5"
            >
              <span>
                <span className="block text-[13px] text-p-muted">Savolingiz bormi?</span>
                <span className="block text-base font-bold">{manager.name}</span>
              </span>
              <span className="flex h-11 items-center gap-2 rounded-xl bg-p-brand px-4 text-[15px] font-bold text-p-brand-ink">
                <Icon icon="solar:phone-calling-bold-duotone" width="20" aria-hidden="true" />
                Qo'ng'iroq
              </span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
