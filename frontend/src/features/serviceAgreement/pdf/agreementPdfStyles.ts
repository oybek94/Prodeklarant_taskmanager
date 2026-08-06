import { StyleSheet } from '@react-pdf/renderer';
import { PDF_FONT_STACK } from '../../../components/pdf/fonts';

/**
 * Invoysdan farqli o'laroq bu yerda masshtablash YO'Q. Invoysda `pdfFit` matnni
 * bir betga sig'dirish uchun bir necha marta qayta chizadi; shartnoma esa
 * tabiiy ravishda ko'p betli yuridik hujjat — shrift qat'iy, betlar o'zi
 * bo'linadi.
 */
/** A4 balandligi (pt) — bet raqamini pastki chetdan joylash uchun kerak */
const A4_HEIGHT = 842;
/** Bet raqami qatorining balandligi: fontSize 9 × lineHeight 1.45 ≈ 13 */
const PAGE_NUMBER_LINE = 13;
/** Bet raqami sahifaning pastki chetidan qancha yuqorida turadi */
const PAGE_NUMBER_BOTTOM_GAP = 24;

export const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 56,
    fontFamily: PDF_FONT_STACK,
    fontSize: 11,
    lineHeight: 1.45,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  h1: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, marginTop: 4 },
  h2: { fontSize: 12, fontWeight: 'bold', marginTop: 12, marginBottom: 6 },
  paragraph: { marginBottom: 6, textAlign: 'justify' },
  bold: { fontWeight: 'bold' },
  table: { width: '100%', borderWidth: 0.75, borderColor: '#9ca3af', marginVertical: 6 },
  tableHeaderRow: { flexDirection: 'row', borderBottomWidth: 0.75, borderBottomColor: '#9ca3af' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#d1d5db' },
  tableCell: { paddingVertical: 3, paddingHorizontal: 4, fontSize: 10 },
  tableCellHeader: { paddingVertical: 3, paddingHorizontal: 4, fontSize: 10, fontWeight: 'bold' },
  signatureRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 22 },
  signatureCol: { width: '45%' },
  signatureLine: { borderTopWidth: 0.75, borderTopColor: '#111827', marginTop: 26, paddingTop: 3, fontSize: 10 },
  /**
   * `top` bilan joylashtirilgan — `bottom` ISHLATIB BO'LMAYDI. @react-pdf 4.5.1
   * da `fixed` + `position: absolute` element balandligi har yangi betda ~81
   * barobar o'sib ketadi (bet 3 da ~7.6e7, bet 10 da ~1.7e21). `bottom` esa shu
   * buzuq balandlikdan hisoblanadi va pdfkit `unsupported number` bilan
   * yiqiladi — ya'ni uzun shartnoma UMUMAN yaratilmaydi. `top` bu zanjirdan
   * mustaqil. (Aniq `height` berish ham yiqilishni to'xtatadi, lekin qatorni
   * butunlay yo'q qiladi — bet raqami chizilmay qoladi.)
   */
  pageNumber: {
    position: 'absolute',
    top: A4_HEIGHT - PAGE_NUMBER_BOTTOM_GAP - PAGE_NUMBER_LINE,
    right: 56,
    fontSize: 9,
    color: '#6b7280',
  },
});
