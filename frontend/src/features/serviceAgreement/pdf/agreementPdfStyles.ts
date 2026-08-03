import { StyleSheet } from '@react-pdf/renderer';
import { PDF_FONT_STACK } from '../../../components/pdf/fonts';

/**
 * Invoysdan farqli o'laroq bu yerda masshtablash YO'Q. Invoysda `pdfFit` matnni
 * bir betga sig'dirish uchun bir necha marta qayta chizadi; shartnoma esa
 * tabiiy ravishda ko'p betli yuridik hujjat — shrift qat'iy, betlar o'zi
 * bo'linadi.
 */
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
  pageNumber: { position: 'absolute', bottom: 24, right: 56, fontSize: 9, color: '#6b7280' },
});
