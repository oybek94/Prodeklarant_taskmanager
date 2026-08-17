import toast from 'react-hot-toast';
import {
  PdfMissingGlyphError,
  describeMissingGlyphs,
  PdfDroppedTextError,
  describeDroppedText,
} from '../../components/invoice/pdf/pdfGlyphCheck';
import { renderAgreementPdf } from './pdf/renderAgreementPdf';
import type { ServiceAgreement } from './types';

/**
 * PDF'ni yasab brauzerga yuklatadi. Ro'yxat ham, muharrir ham shu yerdan
 * chaqiradi — ikki joyda ikki xil xato ishlovi bo'lib qolmasligi uchun.
 */
export async function downloadAgreementPdf(agreement: ServiceAgreement, bhmUzs: number): Promise<void> {
  const toastId = toast.loading('PDF tayyorlanmoqda…');
  try {
    const blob = await renderAgreementPdf(agreement, bhmUzs);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Shartnoma-${agreement.agreementNumber.replace('/', '-')}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success('PDF yuklab olindi', { id: toastId });
  } catch (error) {
    console.error(error);
    // Shriftda glifi yo'q belgi PDF'dan JIMGINA tushib qoladi — bunday hujjat
    // yuridik kuchga ega emas, shuning uchun yuklash to'xtatiladi.
    if (error instanceof PdfMissingGlyphError) {
      toast.error(describeMissingGlyphs(error.missing), { id: toastId, duration: 20000 });
      return;
    }
    // Chizilgan matn manbaga mos kelmadi — hujjatdan harf yo'qolgan
    if (error instanceof PdfDroppedTextError) {
      toast.error(describeDroppedText(error.lines), { id: toastId, duration: 20000 });
      return;
    }
    toast.error('PDF yaratishda xatolik', { id: toastId });
  }
}
