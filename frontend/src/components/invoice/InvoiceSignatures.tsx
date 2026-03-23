import type { Contract } from './types';
import { resolveUploadUrl } from './types';

interface InvoiceSignaturesProps {
  contract: Contract;
  isPdfMode: boolean;
  pdfIncludeSeal: boolean;
}

/**
 * Direktor, imzo va muhr ko'rsatish qismi — Invoys va Upakovochniy list tablarida ko'rinadi.
 */
export function InvoiceSignatures({ contract, isPdfMode, pdfIncludeSeal }: InvoiceSignaturesProps) {
  if (!contract.supplierDirector) return null;

  return (
    <div className="flex flex-row flex-wrap gap-4 items-start">
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="text-base font-semibold text-gray-700">Руководитель Поставщика:</div>
          <div className="text-base text-gray-800">{contract.supplierDirector}</div>
        </div>
        {contract.goodsReleasedBy && (
          <div className="space-y-1">
            <div className="text-base font-semibold text-gray-700">Товар отпустил:</div>
            <div className="text-base text-gray-800">{contract.goodsReleasedBy}</div>
          </div>
        )}
      </div>
      <div className="flex flex-row items-center justify-center gap-3">
        {(contract.sellerSignatureUrl || contract.signatureUrl) && (!isPdfMode || pdfIncludeSeal) && (
          <div>
            <img
              src={resolveUploadUrl(contract.sellerSignatureUrl || contract.signatureUrl)}
              alt="Imzo"
              className="h-[90px] w-auto object-contain"
            />
          </div>
        )}
        {(contract.sellerSealUrl || contract.sealUrl) && (!isPdfMode || pdfIncludeSeal) && (
          <div>
            <img
              src={resolveUploadUrl(contract.sellerSealUrl || contract.sealUrl)}
              alt="Muhr"
              className="h-[215px] w-auto object-contain"
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface SpecSignaturesProps {
  contract: Contract & { buyerDirector?: string; consigneeDirector?: string };
  isPdfMode: boolean;
  pdfIncludeSeal: boolean;
}

/**
 * Spetsifikatsiya tabidagi barcha tomonlarning imzolari.
 */
export function SpecSignatures({ contract }: SpecSignaturesProps) {
  const participants = [
    contract.sellerName ? { label: 'Продавец', name: contract.sellerName, director: contract.supplierDirector, signatureUrl: contract.sellerSignatureUrl, sealUrl: contract.sellerSealUrl } : null,
    contract.buyerName ? { label: 'Покупатель', name: contract.buyerName, director: contract.buyerDirector, signatureUrl: contract.buyerSignatureUrl, sealUrl: contract.buyerSealUrl } : null,
    contract.shipperName ? { label: 'Грузоотправитель', name: contract.shipperName, director: undefined, signatureUrl: undefined, sealUrl: undefined } : null,
    contract.consigneeName ? { label: 'Грузополучатель', name: contract.consigneeName, director: contract.consigneeDirector, signatureUrl: contract.consigneeSignatureUrl, sealUrl: contract.consigneeSealUrl } : null,
  ].filter(Boolean) as Array<{ label: string; name: string; director?: string; signatureUrl?: string; sealUrl?: string }>;

  if (!participants.length) return null;

  return (
    <div className="space-y-4 w-full">
      <div className="text-sm font-semibold text-gray-700">Подписи сторон</div>
      <div className="grid gap-4 w-full" style={{ gridTemplateColumns: `repeat(${participants.length}, 1fr)` }}>
        {participants.map((p) => (
          <div key={`${p.label}-${p.name}`} className="p-3 space-y-2 min-w-0 flex flex-col">
            <div className="text-sm font-semibold text-gray-800">{p.label}</div>
            <div className="flex flex-col gap-3">
              <div className="grid gap-3" style={{ gridTemplateColumns: '2fr 1fr' }}>
                <div className="min-h-[4rem] p-2 flex flex-col justify-center text-sm text-gray-700 min-w-0">
                  {p.name}
                  {p.director != null && p.director !== '' && (
                    <div className="text-gray-600 mt-0.5">
                      {p.label === 'Покупатель' || p.label === 'Грузополучатель' ? p.director : `Директор ${p.director}`}
                    </div>
                  )}
                </div>
                {p.signatureUrl && (
                  <div className="h-16 flex items-start justify-start overflow-hidden">
                    <img src={resolveUploadUrl(p.signatureUrl)} alt="" className="h-full w-auto max-w-full object-contain" />
                  </div>
                )}
              </div>
              {p.sealUrl && (
                <div className="h-[215px] flex flex-col items-start justify-start overflow-hidden">
                  <img src={resolveUploadUrl(p.sealUrl)} alt="" className="h-full w-auto max-w-full object-contain" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
