import { useEffect, useState } from 'react';

import { listAgreements } from '../../../features/serviceAgreement/api';

export interface InvoiceServiceAgreement {
  /** Shartnomalar sahifasidagi raqam */
  number: string;
  /** YYYY-MM-DD */
  date: string;
  /** Solishtirish uchun — bir mijozda bir nechta shartnoma bo'lganda ajratadi */
  customerInn: string | null;
}

/**
 * BYUD 54-grafasidagi "Битим рақами" — mijoz bilan tuzilgan XIZMAT shartnomasi
 * (Shartnomalar sahifasi), tashqi savdo shartnomasi emas.
 *
 * Bitta Client (masalan, vositachi/broker) nomiga bir nechta korxona uchun
 * alohida shartnoma tuzilgan bo'lishi mumkin — shu sababli BARCHA aktiv
 * shartnomalar qaytariladi, aniq qaysi biri kerakligini chaqiruvchi (invoysdagi
 * eksportyor INN iga qarab) hal qiladi. Bitta "eng oxirgisini" olish xato
 * korxonaning shartnoma raqamini yozib qo'yishi mumkin edi.
 */
export function useInvoiceServiceAgreement(clientId?: number): InvoiceServiceAgreement[] | null {
  const [agreements, setAgreements] = useState<InvoiceServiceAgreement[] | null>(null);

  useEffect(() => {
    if (!clientId) {
      setAgreements(null);
      return;
    }

    let cancelled = false;
    listAgreements({ clientId, status: 'ACTIVE', limit: 50 })
      .then((response) => {
        if (cancelled) return;
        setAgreements(
          response.items.map((item) => ({
            number: item.agreementNumber,
            date: String(item.agreementDate).split('T')[0],
            customerInn: item.customerInn,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setAgreements(null);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return agreements;
}
