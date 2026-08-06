import { useEffect, useState } from 'react';
import { renderAgreementPdf } from '../../features/serviceAgreement/pdf/renderAgreementPdf';
import { PdfMissingGlyphError, describeMissingGlyphs } from '../invoice/pdf/pdfGlyphCheck';
import type { ServiceAgreement } from '../../features/serviceAgreement/types';

interface Props {
  agreement: ServiceAgreement;
  bhmUzs: number;
}

/**
 * Jonli preview. Ko'rinayotgan narsa — yuklab olinadigan PDF'ning O'ZI:
 * ikkinchi (HTML) renderer yo'q, shuning uchun preview bilan hujjat ajralib
 * keta olmaydi. Har tugma bosilishida qayta chizmaslik uchun 500ms debounce.
 */
export default function AgreementPreview({ agreement, bhmUzs }: Props) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';
    setPending(true);

    const timer = setTimeout(() => {
      renderAgreementPdf(agreement, bhmUzs)
        .then((blob) => {
          if (cancelled) return;
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
          setError('');
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          // Glif xatosidan boshqasi ekranda umumiy matn bo'lib ko'rinadi —
          // asl sabab konsolda qolsin, aks holda uni topib bo'lmaydi.
          if (!(err instanceof PdfMissingGlyphError)) console.error('[AgreementPreview]', err);
          setError(err instanceof PdfMissingGlyphError ? describeMissingGlyphs(err.missing) : 'PDF yaratilmadi');
        })
        .finally(() => { if (!cancelled) setPending(false); });
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [agreement, bhmUzs]);

  if (error) {
    return <pre className="whitespace-pre-wrap rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</pre>;
  }

  return (
    <div className="relative h-[calc(100vh-160px)] rounded-lg border border-gray-200 bg-gray-50">
      {pending && (
        <span className="absolute right-3 top-3 z-10 rounded bg-white/90 px-2 py-1 text-xs text-gray-500">
          Yangilanmoqda…
        </span>
      )}
      {url && <iframe src={url} title="Shartnoma" className="h-full w-full rounded-lg" />}
    </div>
  );
}
