import { useEffect, useState } from 'react';

import { listAgreements } from '../../../features/serviceAgreement/api';

export interface InvoiceServiceAgreement {
  /** Shartnomalar sahifasidagi raqam */
  number: string;
  /** YYYY-MM-DD */
  date: string;
}

/**
 * BYUD 54-grafasidagi "Битим рақами" — mijoz bilan tuzilgan XIZMAT shartnomasi
 * (Shartnomalar sahifasi), tashqi savdo shartnomasi emas. Bir mijozda bir
 * nechtasi bo'lsa, amaldagilarining eng oxirgisi olinadi — server
 * `agreementDate desc` bo'yicha saralab beradi.
 *
 * Topilmasa `null` qaytadi va kengaytma 54-grafaga hech narsa yozmaydi:
 * begona raqam yozib qo'yishdan ko'ra bo'sh qoldirib ogohlantirgan afzal.
 */
export function useInvoiceServiceAgreement(clientId?: number): InvoiceServiceAgreement | null {
  const [agreement, setAgreement] = useState<InvoiceServiceAgreement | null>(null);

  useEffect(() => {
    if (!clientId) {
      setAgreement(null);
      return;
    }

    let cancelled = false;
    listAgreements({ clientId, status: 'ACTIVE', limit: 1 })
      .then((response) => {
        if (cancelled) return;
        const found = response.items[0];
        setAgreement(
          found
            ? { number: found.agreementNumber, date: String(found.agreementDate).split('T')[0] }
            : null,
        );
      })
      .catch(() => {
        if (!cancelled) setAgreement(null);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return agreement;
}
