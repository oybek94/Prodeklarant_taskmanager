import { useCallback } from 'react';
import apiClient from '../../../lib/api';
import type { Invoice as InvoiceType, RegionCode, FssFilePrefix, Task } from '../types';
import {
  sanitizeFileName,
  getVehiclePlate,
  downloadDocumentResponse,
  waitForPaint,
} from '../invoiceUtils';

interface UseInvoiceDownloadsParams {
  form: {
    invoiceNumber: string | undefined;
    vehicleNumber: string;
    fssRegionInternalCode: string;
    fssRegionName: string;
    fssRegionExternalCode: string;
    [key: string]: unknown;
  };
  setForm: (updater: (prev: any) => any) => void;
  invoice: InvoiceType | null;
  invoiceRef: React.RefObject<HTMLDivElement | null>;
  task: Task | null;
  taskId: string | undefined;
  regionCodes: RegionCode[];
  setRegionCodes: (codes: RegionCode[]) => void;
  regionCodesLoading: boolean;
  setRegionCodesLoading: (v: boolean) => void;
  fssFilePrefix: FssFilePrefix;
  setFssFilePrefix: (v: FssFilePrefix) => void;
  fssAutoDownload: boolean;
  setFssAutoDownload: (v: boolean) => void;
  setShowFssRegionModal: (v: boolean) => void;
  setIsPdfMode: (v: boolean) => void;
  setPdfIncludeSeal: (v: boolean) => void;
}

export function useInvoiceDownloads({
  form,
  setForm,
  invoice,
  invoiceRef,
  task,
  taskId,
  regionCodes,
  setRegionCodes,
  regionCodesLoading,
  setRegionCodesLoading,
  fssFilePrefix,
  setFssFilePrefix,
  fssAutoDownload,
  setFssAutoDownload,
  setShowFssRegionModal,
  setIsPdfMode,
  setPdfIncludeSeal,
}: UseInvoiceDownloadsParams) {

  // --- Utility builders ---

  const buildDownloadBase = useCallback((type: string) => {
    const plate = sanitizeFileName(getVehiclePlate(form.vehicleNumber) || (invoice?.invoiceNumber || form.invoiceNumber || 'N')).replace(/\s+/g, '_');
    return `${type}_${plate}`;
  }, [form.vehicleNumber, form.invoiceNumber, invoice?.invoiceNumber]);

  const buildInvoiceDownloadBase = useCallback(() => {
    const inv = sanitizeFileName(invoice?.invoiceNumber || form.invoiceNumber || 'Invoice');
    const plate = getVehiclePlate(form.vehicleNumber)?.trim() || '';
    return plate ? `${inv} АВТО ${plate}` : inv;
  }, [form.vehicleNumber, form.invoiceNumber, invoice?.invoiceNumber]);

  // --- PDF ---

  const generatePdf = useCallback(async (includeSeal: boolean) => {
    if (!invoiceRef.current) {
      alert("Invoice ko'rinishi topilmadi");
      return;
    }

    const wasDark = document.documentElement.classList.contains('dark');
    if (wasDark) {
      document.documentElement.classList.remove('dark');
    }

    // Avval pechat holatini o'rnatib, renderga vaqt beramiz
    setPdfIncludeSeal(includeSeal);
    await waitForPaint();
    setIsPdfMode(true);
    await waitForPaint();
    // Qo'shimcha kutish — React batch update to'liq renderlanishi uchun
    await new Promise(r => setTimeout(r, 100));

    const { default: html2canvas } = await import('html2canvas');
    const { jsPDF } = await import('jspdf');

    const element = invoiceRef.current;
    const canvas = await html2canvas(element, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', 1);
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginVertical = 20;
    const marginHorizontal = 10;
    const maxWidth = pageWidth - marginHorizontal * 2;
    // Har doim kenglik bo'yicha masshtabni olamiz, shunda chetlarda bo'sh joy qolmaydi
    const scale = maxWidth / canvas.width;
    const imgWidth = canvas.width * scale;
    const imgHeight = canvas.height * scale;
    const x = marginHorizontal;
    const y = marginVertical;
    pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);

    const fileBase = buildInvoiceDownloadBase();
    pdf.save(`${fileBase}.pdf`);

    setIsPdfMode(false);
    setPdfIncludeSeal(true);
    if (wasDark) {
      document.documentElement.classList.add('dark');
    }
  }, [invoiceRef, buildInvoiceDownloadBase, setIsPdfMode, setPdfIncludeSeal]);

  const generatePdfEn = useCallback(async () => {
    if (!invoice?.id) {
      alert('Invoice topilmadi');
      return;
    }
    try {
      const response = await apiClient.get(`/invoices/${invoice.id}/pdf-en`, {
        responseType: 'blob',
      });
      const fileName = `${buildInvoiceDownloadBase()}_EN.pdf`;
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading English PDF:', error);
      alert(error instanceof Error ? error.message : 'English PDF yuklab olishda xatolik yuz berdi');
    }
  }, [invoice?.id, buildInvoiceDownloadBase]);

  // --- Process tracking ---

  const trackProcessDownload = useCallback((processType: 'TIR' | 'CERT' | 'DECLARATION') => {
    const tid = taskId ? Number(taskId) : invoice?.taskId;
    if (!tid || !Number.isFinite(tid)) return;
    apiClient.post('/process/download', { taskId: tid, processType }).catch(() => { });
  }, [taskId, invoice?.taskId]);

  // --- Region codes ---

  const loadRegionCodes = useCallback(async (): Promise<RegionCode[]> => {
    if (regionCodesLoading) return regionCodes;
    setRegionCodesLoading(true);
    try {
      const response = await apiClient.get('/region-codes');
      const data = Array.isArray(response.data) ? (response.data as RegionCode[]) : [];
      setRegionCodes(data);
      return data;
    } catch (error) {
      console.error('Error loading region codes:', error);
      alert('Hudud kodlarini yuklashda xatolik yuz berdi');
      return [];
    } finally {
      setRegionCodesLoading(false);
    }
  }, [regionCodesLoading, regionCodes, setRegionCodesLoading, setRegionCodes]);

  const findOltiariqRegion = useCallback((list: RegionCode[]) => {
    return list.find((region) => {
      const name = region.name.toLowerCase();
      return name.includes('олтиарик') || name.includes('oltiariq');
    });
  }, []);

  // --- FSS Query Builder ---

  const buildFssQuery = useCallback((override?: {
    internalCode?: string;
    name?: string;
    externalCode?: string;
    templateType?: 'ichki' | 'tashqi';
  }) => {
    const params = new URLSearchParams();
    const internalCode = override?.internalCode ?? form.fssRegionInternalCode;
    const name = override?.name ?? form.fssRegionName;
    const externalCode = override?.externalCode ?? form.fssRegionExternalCode;
    if (internalCode) params.set('regionInternalCode', internalCode);
    if (name) params.set('regionName', name);
    if (externalCode) params.set('regionExternalCode', externalCode);
    if (override?.templateType) params.set('template', override.templateType);
    return params.toString();
  }, [form.fssRegionInternalCode, form.fssRegionName, form.fssRegionExternalCode]);

  // --- Download template (generic) ---

  const downloadTemplate = useCallback(async (
    endpoint: string,
    filePrefix: string,
    errorLabel: string,
    processType?: 'TIR' | 'CERT' | 'DECLARATION',
    overrideFileName?: string
  ) => {
    if (!invoice?.id) {
      alert('Invoice topilmadi');
      return;
    }
    try {
      const response = await apiClient.get(`/invoices/${invoice.id}/${endpoint}`, {
        responseType: 'blob',
      });
      const fileName = overrideFileName || `${buildDownloadBase(filePrefix)}.xlsx`;
      await downloadDocumentResponse(response, fileName, `${errorLabel} yuklab olishda xatolik yuz berdi`);
      if (processType) trackProcessDownload(processType);
    } catch (error) {
      console.error(`Error downloading ${errorLabel}:`, error);
      alert(error instanceof Error ? error.message : `${errorLabel} yuklab olishda xatolik yuz berdi`);
    }
  }, [invoice?.id, buildDownloadBase, trackProcessDownload]);

  // --- Specific template generators ---

  const generateSmrExcel = useCallback(() => downloadTemplate('cmr', 'SMR', 'CMR', 'TIR'), [downloadTemplate]);
  const generateTirExcel = useCallback(() => downloadTemplate('tir', 'TIR', 'TIR', 'TIR'), [downloadTemplate]);
  const generateST1Excel = useCallback(() => downloadTemplate('st1', 'ST1', 'ST-1 shabloni', 'CERT'), [downloadTemplate]);
  const generateCommodityEkExcel = useCallback(() => downloadTemplate('commodity-ek', 'COMMODITY', 'Deklaratsiya shabloni', 'DECLARATION', 'CommodityEk_New.xlsx'), [downloadTemplate]);
  const generateCmrDoc = useCallback(async () => {
    if (!invoice?.id) {
      alert('Invoice topilmadi');
      return;
    }
    try {
      const response = await apiClient.get(`/invoices/${invoice.id}/cmr-doc`, {
        responseType: 'blob',
      });
      const fileName = `${buildDownloadBase('CMR')}.docx`;
      await downloadDocumentResponse(response, fileName, `CMR shablonini yuklab olishda xatolik yuz berdi`);
      trackProcessDownload('TIR');
    } catch (error) {
      console.error(`Error downloading CMR:`, error);
      alert(error instanceof Error ? error.message : `CMR shablonini yuklab olishda xatolik yuz berdi`);
    }
  }, [invoice?.id, buildDownloadBase, trackProcessDownload]);

  // --- FSS Excel ---

  const generateFssExcel = useCallback(async (override?: {
    internalCode?: string;
    name?: string;
    externalCode?: string;
    filePrefix?: FssFilePrefix;
    templateType?: 'ichki' | 'tashqi';
  }) => {
    if (!invoice?.id) { alert('Invoice topilmadi'); return; }
    try {
      const query = buildFssQuery(override);
      const url = query ? `/invoices/${invoice.id}/fss?${query}` : `/invoices/${invoice.id}/fss`;
      const response = await apiClient.get(url, { responseType: 'blob' });
      const prefix = override?.filePrefix || fssFilePrefix || 'Ichki';
      const fileName = `${buildDownloadBase(prefix.toUpperCase())}.xlsx`;
      await downloadDocumentResponse(response, fileName, 'FSS yuklab olishda xatolik yuz berdi');
      trackProcessDownload('CERT');
    } catch (error) {
      console.error('Error downloading FSS:', error);
      alert(error instanceof Error ? error.message : 'FSS yuklab olishda xatolik yuz berdi');
    }
  }, [invoice?.id, buildFssQuery, buildDownloadBase, fssFilePrefix, trackProcessDownload]);

  // --- Invoice Excel ---

  const generateInvoiceExcel = useCallback(async () => {
    if (!invoice?.id) { alert('Invoice topilmadi'); return; }
    try {
      const response = await apiClient.get(`/invoices/${invoice.id}/xlsx`, { responseType: 'blob' });
      const fileName = `${buildInvoiceDownloadBase()}.xlsx`;
      await downloadDocumentResponse(response, fileName, 'Invoys Excel yuklab olishda xatolik yuz berdi');
    } catch (error) {
      console.error('Error downloading Invoice Excel:', error);
      alert(error instanceof Error ? error.message : 'Invoys Excel yuklab olishda xatolik yuz berdi');
    }
  }, [invoice?.id, buildInvoiceDownloadBase]);

  // --- FSS Region Picker ---

  const openFssRegionPicker = useCallback(async (prefix: FssFilePrefix = 'Ichki') => {
    setFssFilePrefix(prefix);
    setFssAutoDownload(true);

    // Oltiariq filiali uchun — formani o'zgartirmasdan to'g'ridan-to'g'ri yuklab olish.
    // setForm() chaqirilmaydi, shuning uchun form "dirty" bo'lmaydi va
    // boshqa shablonlarni yuklab olish imkoniyati saqlanib qoladi.
    const branchName = task?.branch?.name?.toLowerCase() || '';
    const isOltiariqBranch = branchName.includes('oltiariq');
    if (isOltiariqBranch) {
      const list = regionCodes.length ? regionCodes : await loadRegionCodes();
      const match = findOltiariqRegion(list);
      if (match) {
        await generateFssExcel({
          internalCode: match.internalCode,
          name: match.name,
          externalCode: match.externalCode,
          filePrefix: prefix,
          templateType: prefix === 'Ichki' ? 'ichki' : 'tashqi',
        });
        return;
      }
    }

    // Boshqa filiallar uchun — saqlangan tuman ma'lumotlari bilan yuklab olish
    const hasSavedRegion =
      form.fssRegionName &&
      (form.fssRegionInternalCode || form.fssRegionExternalCode);
    if (hasSavedRegion) {
      await generateFssExcel({
        internalCode: form.fssRegionInternalCode,
        name: form.fssRegionName,
        externalCode: form.fssRegionExternalCode,
        filePrefix: prefix,
        templateType: prefix === 'Ichki' ? 'ichki' : 'tashqi',
      });
      return;
    }
    setShowFssRegionModal(true);
    if (!regionCodes.length) {
      await loadRegionCodes();
    }
  }, [form.fssRegionName, form.fssRegionInternalCode, form.fssRegionExternalCode, task?.branch?.name, regionCodes, loadRegionCodes, findOltiariqRegion, setShowFssRegionModal, setFssFilePrefix, setFssAutoDownload, generateFssExcel]);

  const openFssRegionSelector = useCallback(async () => {
    setFssAutoDownload(false);
    const branchName = task?.branch?.name?.toLowerCase() || '';
    const isOltiariqBranch = branchName.includes('oltiariq');
    if (isOltiariqBranch) {
      // Oltiariq uchun tuman avtomatik tanlanadi, formaga saqlamasdan
      // Tuman tugmasi Oltiariq uchun yashirin, shuning uchun bu faqat himoya
      return;
    }
    setShowFssRegionModal(true);
    if (!regionCodes.length) {
      await loadRegionCodes();
    }
  }, [task?.branch?.name, regionCodes, loadRegionCodes, setShowFssRegionModal, setFssAutoDownload]);

  return {
    generatePdf,
    generateSmrExcel,
    generateCmrDoc,
    generateTirExcel,
    generateST1Excel,
    generateCommodityEkExcel,
    generateFssExcel,
    generateInvoiceExcel,
    generatePdfEn,
    openFssRegionPicker,
    openFssRegionSelector,
    loadRegionCodes,
    trackProcessDownload,
    buildFssQuery,
  };
}
