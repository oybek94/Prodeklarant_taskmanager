import { useCallback } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import apiClient from '../../lib/api';
import { downloadExcelResponse } from './invoiceUtils';
import type { FssFilePrefix } from './types';

interface UseInvoiceDocumentsOptions {
  invoiceId: number | undefined;
  taskId: string | undefined;
  fssFilePrefix: FssFilePrefix;
  buildDownloadBase: (type: string) => string;
  buildInvoiceDownloadBase: () => string;
  buildFssQuery: (override?: any) => string;
  invoiceRef: React.RefObject<HTMLDivElement | null>;
  setIsPdfMode: (v: boolean) => void;
  setPdfIncludeSeal: (v: boolean) => void;
  wasDark: boolean;
  waitForPaint: () => Promise<void>;
}

export function useInvoiceDocuments({
  invoiceId,
  taskId,
  fssFilePrefix,
  buildDownloadBase,
  buildInvoiceDownloadBase,
  buildFssQuery,
  invoiceRef,
  setIsPdfMode,
  setPdfIncludeSeal,
  wasDark,
  waitForPaint,
}: UseInvoiceDocumentsOptions) {
  const trackProcessDownload = useCallback(
    (processType: 'TIR' | 'CERT' | 'DECLARATION') => {
      if (!taskId) return;
      const tid = Number(taskId);
      if (!Number.isFinite(tid)) return;
      apiClient.post('/process/download', { taskId: tid, processType }).catch(() => {});
    },
    [taskId]
  );

  const generateSmrExcel = useCallback(async () => {
    if (!invoiceId) {
      alert('Invoice topilmadi');
      return;
    }
    try {
      const response = await apiClient.get(`/invoices/${invoiceId}/cmr`, {
        responseType: 'blob',
      });
      const fileName = `${buildDownloadBase('SMR')}.xlsx`;
      await downloadExcelResponse(response, fileName, 'CMR yuklab olishda xatolik yuz berdi');
      trackProcessDownload('TIR');
    } catch (error) {
      console.error('Error downloading CMR:', error);
      alert(error instanceof Error ? error.message : 'CMR yuklab olishda xatolik yuz berdi');
    }
  }, [invoiceId, buildDownloadBase, trackProcessDownload]);

  const generateTirExcel = useCallback(async () => {
    if (!invoiceId) {
      alert('Invoice topilmadi');
      return;
    }
    try {
      const response = await apiClient.get(`/invoices/${invoiceId}/tir`, {
        responseType: 'blob',
      });
      const fileName = `${buildDownloadBase('TIR')}.xlsx`;
      await downloadExcelResponse(response, fileName, 'TIR yuklab olishda xatolik yuz berdi');
      trackProcessDownload('TIR');
    } catch (error) {
      console.error('Error downloading TIR:', error);
      alert(error instanceof Error ? error.message : 'TIR yuklab olishda xatolik yuz berdi');
    }
  }, [invoiceId, buildDownloadBase, trackProcessDownload]);

  const generateFssExcel = useCallback(
    async (override?: {
      internalCode?: string;
      name?: string;
      externalCode?: string;
      filePrefix?: FssFilePrefix;
      templateType?: 'ichki' | 'tashqi';
    }) => {
      if (!invoiceId) {
        alert('Invoice topilmadi');
        return;
      }
      try {
        const query = buildFssQuery(override);
        const url = query ? `/invoices/${invoiceId}/fss?${query}` : `/invoices/${invoiceId}/fss`;
        const response = await apiClient.get(url, { responseType: 'blob' });
        const prefix = override?.filePrefix || fssFilePrefix || 'Ichki';
        const fileName = `${buildDownloadBase(prefix.toUpperCase())}.xlsx`;
        await downloadExcelResponse(response, fileName, 'FSS yuklab olishda xatolik yuz berdi');
        trackProcessDownload('CERT');
      } catch (error) {
        console.error('Error downloading FSS:', error);
        alert(error instanceof Error ? error.message : 'FSS yuklab olishda xatolik yuz berdi');
      }
    },
    [invoiceId, buildFssQuery, fssFilePrefix, buildDownloadBase, trackProcessDownload]
  );

  const generateInvoiceExcel = useCallback(async () => {
    if (!invoiceId) {
      alert('Invoice topilmadi');
      return;
    }
    try {
      const response = await apiClient.get(`/invoices/${invoiceId}/xlsx`, {
        responseType: 'blob',
      });
      const fileName = `${buildInvoiceDownloadBase()}.xlsx`;
      await downloadExcelResponse(response, fileName, 'Invoys Excel yuklab olishda xatolik yuz berdi');
    } catch (error) {
      console.error('Error downloading Invoice Excel:', error);
      alert(error instanceof Error ? error.message : 'Invoys Excel yuklab olishda xatolik yuz berdi');
    }
  }, [invoiceId, buildInvoiceDownloadBase]);

  const generateST1Excel = useCallback(async () => {
    if (!invoiceId) {
      alert('Invoice topilmadi');
      return;
    }
    try {
      const response = await apiClient.get(`/invoices/${invoiceId}/st1`, {
        responseType: 'blob',
      });
      const fileName = `${buildDownloadBase('ST1')}.xlsx`;
      await downloadExcelResponse(response, fileName, 'ST-1 shabloni yuklab olishda xatolik yuz berdi');
      trackProcessDownload('CERT');
    } catch (error) {
      console.error('Error downloading ST-1 Excel:', error);
      alert(error instanceof Error ? error.message : 'ST-1 shabloni yuklab olishda xatolik yuz berdi');
    }
  }, [invoiceId, buildDownloadBase, trackProcessDownload]);

  const generateCommodityEkExcel = useCallback(async () => {
    if (!invoiceId) {
      alert('Invoice topilmadi');
      return;
    }
    try {
      const response = await apiClient.get(`/invoices/${invoiceId}/commodity-ek`, {
        responseType: 'blob',
      });
      const fileName = 'CommodityEk_New.xlsx';
      await downloadExcelResponse(response, fileName, 'Deklaratsiya shabloni yuklab olishda xatolik yuz berdi');
      trackProcessDownload('DECLARATION');
    } catch (error) {
      console.error('Error downloading Deklaratsiya Excel:', error);
      alert(error instanceof Error ? error.message : 'Deklaratsiya shabloni yuklab olishda xatolik yuz berdi');
    }
  }, [invoiceId, trackProcessDownload]);

  const generatePdf = useCallback(async (includeSeal: boolean) => {
    if (!invoiceRef.current) {
      alert("Invoysni PDF ga o`tkazish uchun yordamchi element topilmadi");
      return;
    }

    setPdfIncludeSeal(includeSeal);
    setIsPdfMode(true);
    await waitForPaint();

    try {
      const element = invoiceRef.current;
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginVertical = 20;
      const marginHorizontal = 10;
      const maxWidth = pageWidth - marginHorizontal * 2;
      const maxHeight = pageHeight - marginVertical * 2;
      const scale = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
      const imgWidth = canvas.width * scale;
      const imgHeight = canvas.height * scale;
      const x = marginHorizontal;
      const y = marginVertical;
      pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);

      const fileBase = buildInvoiceDownloadBase();
      pdf.save(`${fileBase}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsPdfMode(false);
      setPdfIncludeSeal(true);
      if (wasDark) {
        document.documentElement.classList.add('dark');
      }
    }
  }, [invoiceRef, buildInvoiceDownloadBase, setIsPdfMode, setPdfIncludeSeal, wasDark, waitForPaint]);

  return {
    generateSmrExcel,
    generateTirExcel,
    generateFssExcel,
    generateInvoiceExcel,
    generateST1Excel,
    generateCommodityEkExcel,
    generatePdf,
  };
}
