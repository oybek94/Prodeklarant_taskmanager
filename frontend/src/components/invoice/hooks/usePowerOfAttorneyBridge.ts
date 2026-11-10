import { useEffect } from 'react';
import apiClient from '../../../lib/api';

/**
 * Chrome kengaytmasi (cargo.customs.uz to'ldirgichi) ishonchnoma API siga shu
 * sahifa orqali murojaat qiladi: tokenlar faqat ilovada turadi, kengaytma ularni
 * ko'rmaydi. So'rov va javob postMessage orqali, requestId bilan juftlanadi.
 *
 *   reserve — haydovchi JSHSHIR i bo'yicha raqam oladi → { number, date }
 *   save    — saytdan o'qilgan haydovchi ma'lumotini saqlaydi
 */

type PoaAction = 'reserve' | 'save';

interface PoaRequest {
  type: 'PRODEKLARANT_POA_REQUEST';
  requestId: string;
  action: PoaAction;
  payload: Record<string, unknown>;
}

const isPoaRequest = (data: unknown): data is PoaRequest => {
  if (typeof data !== 'object' || data === null) return false;
  const candidate = data as Partial<PoaRequest>;
  return (
    candidate.type === 'PRODEKLARANT_POA_REQUEST' &&
    typeof candidate.requestId === 'string' &&
    (candidate.action === 'reserve' || candidate.action === 'save') &&
    typeof candidate.payload === 'object' &&
    candidate.payload !== null
  );
};

const errorMessage = (error: unknown): string => {
  const apiMessage = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
  if (apiMessage) return apiMessage;
  return error instanceof Error ? error.message : 'Noma\'lum xatolik';
};

export function usePowerOfAttorneyBridge(invoiceId?: number) {
  useEffect(() => {
    const handleRequest = async (event: MessageEvent) => {
      // Faqat shu oynaning o'zidan (kengaytma executeScript orqali yuboradi)
      if (event.source !== window || !isPoaRequest(event.data)) return;
      const { requestId, action, payload } = event.data;

      const reply = (body: { ok: boolean; data?: unknown; error?: string }) =>
        window.postMessage({ type: 'PRODEKLARANT_POA_RESPONSE', requestId, ...body }, '*');

      if (!invoiceId) {
        reply({ ok: false, error: 'Invoys hali saqlanmagan — avval saqlang' });
        return;
      }

      try {
        const response =
          action === 'reserve'
            ? await apiClient.post(`/invoices/${invoiceId}/power-of-attorney`, payload)
            : await apiClient.put(`/invoices/${invoiceId}/power-of-attorney/driver`, payload);
        reply({ ok: true, data: response.data });
      } catch (error) {
        reply({ ok: false, error: errorMessage(error) });
      }
    };

    window.addEventListener('message', handleRequest);
    return () => window.removeEventListener('message', handleRequest);
  }, [invoiceId]);
}
