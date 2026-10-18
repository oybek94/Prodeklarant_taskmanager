import { useState } from 'react';
import { Icon } from '@iconify/react';
import { downloadPortalDocument } from '../lib/download';
import { apiErrorMessage } from '../lib/portalApi';
import { fileExt, formatDate } from '../format';
import type { PortalDocument } from '../types';

const TYPE_LABEL: Record<string, string> = {
  INVOICE: 'Invoys',
  ST: 'ST-1',
  FITO: 'Fitosanitar',
  CMR: 'CMR',
  TIR: 'TIR',
};

export function docTitle(d: PortalDocument): string {
  return d.type && TYPE_LABEL[d.type] ? `${TYPE_LABEL[d.type]} · ${d.name}` : d.name;
}

export default function DocumentRow({ doc, showShipment = false }: { doc: PortalDocument; showShipment?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDownload = async () => {
    setBusy(true);
    setError(null);
    try {
      await downloadPortalDocument(doc.id, doc.name);
    } catch (e) {
      setError(apiErrorMessage(e, 'Yuklab bo\'lmadi'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-16 flex-wrap items-center gap-x-3.5 gap-y-1 border-b border-p-line py-3 last:border-b-0">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-p-tint text-xs font-extrabold text-p-tint-ink">
        {fileExt(doc.name, doc.fileType)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-semibold">{docTitle(doc)}</div>
        <div className="truncate text-[13px] text-p-muted">
          {showShipment && <>{doc.shipmentTitle} · </>}
          {formatDate(doc.createdAt)}
        </div>
      </div>
      <button
        type="button"
        onClick={onDownload}
        disabled={busy}
        aria-label={`${doc.name} hujjatini yuklab olish`}
        className="flex h-12 shrink-0 items-center gap-2 rounded-xl bg-p-tint px-3.5 text-sm font-bold text-p-tint-ink disabled:opacity-60 md:h-11"
      >
        <Icon icon={busy ? 'solar:refresh-circle-bold-duotone' : 'solar:download-minimalistic-bold-duotone'} width="20" className={busy ? 'animate-spin' : ''} aria-hidden="true" />
        <span className="hidden sm:inline">{busy ? 'Yuklanmoqda…' : 'Yuklab olish'}</span>
      </button>
      {error && <div role="alert" className="basis-full pl-[58px] text-[13px] font-medium text-p-red-fg">{error}</div>}
    </div>
  );
}
