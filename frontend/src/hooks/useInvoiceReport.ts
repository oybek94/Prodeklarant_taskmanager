import { useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../lib/api';
import type { Branch, Client, InvoicesFilters } from '../components/invoices/types';
import { formatDateOnly } from '../utils/dateFormatting';

// Hisobot ustunlari (valyuta — invoyslar turli valyutada bo'lishi mumkin)
export const INVOICE_REPORT_COLUMNS = {
  taskName: 'Task nomi',
  clientName: 'Mijoz',
  sellerName: 'Sotuvchi nomi',
  buyerName: 'Sotib oluvchi nomi',
  contractNumber: 'Shartnoma raqami',
  invoiceNumber: 'Invoys raqami',
  invoiceDate: 'Sana',
  deliveryTerms: 'Условия поставки',
  vehicleNumber: 'Номер автотранспорта',
  customsAddress: 'Место там. очистки',
  productNames: 'Наименование товара',
  totalAmount: 'Общая сумма',
  currency: 'Валюта',
} as const;

export type InvoiceReportColumnKey = keyof typeof INVOICE_REPORT_COLUMNS;

type InvoiceReportRow = Record<InvoiceReportColumnKey, string>;

interface InvoiceReportResponse {
  rows: InvoiceReportRow[];
  total: number;
  limit: number;
}

const COLUMN_WIDTHS: Partial<Record<InvoiceReportColumnKey, number>> = {
  productNames: 50,
  sellerName: 30,
  buyerName: 30,
  customsAddress: 25,
  deliveryTerms: 25,
  totalAmount: 18,
  invoiceDate: 14,
  currency: 10,
};

// Fayl nomida ishlatib bo'lmaydigan belgilar olib tashlanadi, bo'shliqlar "_" ga
const toFilePart = (value: string) =>
  value.replace(/[\\/:*?"<>|«»'`]/g, '').trim().replace(/\s+/g, '_');

// "2026-10-01" -> "01-10"
const toDayMonth = (isoDate: string) => {
  const [, month, day] = isoDate.split('-');
  return day && month ? `${day}-${month}` : isoDate;
};

/** Fayl nomi filtrlardan: Mijoz_Filial_01-10_31-10.xlsx; filtr bo'lmasa — Invoyslar_Hisobot_<bugun>.xlsx */
const buildReportFilename = (filters: InvoicesFilters, branches: Branch[], clients: Client[]) => {
  const clientName = clients.find((c) => String(c.id) === filters.clientId)?.name;
  const branchName = branches.find((b) => String(b.id) === filters.branchId)?.name;
  const parts = [clientName, branchName].filter((v): v is string => Boolean(v)).map(toFilePart);
  if (filters.startDate && filters.endDate) {
    parts.push(toDayMonth(filters.startDate), toDayMonth(filters.endDate));
  } else if (filters.startDate) {
    parts.push(`${toDayMonth(filters.startDate)}_dan`);
  } else if (filters.endDate) {
    parts.push(`${toDayMonth(filters.endDate)}_gacha`);
  }
  const name = parts.filter(Boolean).join('_');
  return `${name || `Invoyslar_Hisobot_${new Date().toISOString().split('T')[0]}`}.xlsx`;
};

export const useInvoiceReport = (
  filters: InvoicesFilters,
  searchQuery: string,
  branches: Branch[],
  clients: Client[],
) => {
  const [reportLoading, setReportLoading] = useState(false);

  // Invoyslar ro'yxatidagi filtrlar bilan backenddan barcha yozuvlarni olib, tanlangan ustunlar bo'yicha Excel yaratish
  const exportInvoiceReport = async (selectedColumns: Record<InvoiceReportColumnKey, boolean>) => {
    try {
      setReportLoading(true);

      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (filters.branchId) params.append('branchId', filters.branchId);
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const { data } = await apiClient.get<InvoiceReportResponse>(`/invoices/report?${params.toString()}`);
      const rows = Array.isArray(data?.rows) ? data.rows : [];

      if (rows.length === 0) {
        toast.error('Hisobot uchun ma\'lumot topilmadi');
        return;
      }
      if (data.total > rows.length) {
        toast(`Faqat oxirgi ${rows.length} ta invoys hisobotga kiritildi (jami ${data.total})`, { icon: '⚠️' });
      }

      let activeColumns = (Object.keys(INVOICE_REPORT_COLUMNS) as InvoiceReportColumnKey[])
        .filter((key) => selectedColumns[key]);
      // Sana birinchi ustun bo'ladi (arxiv hisoboti bilan bir xil)
      if (activeColumns.includes('invoiceDate')) {
        activeColumns = ['invoiceDate', ...activeColumns.filter((c) => c !== 'invoiceDate')];
      }

      const { default: ExcelJS } = await import('exceljs');
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Hisobot');
      ws.columns = activeColumns.map((key) => ({
        header: INVOICE_REPORT_COLUMNS[key],
        width: COLUMN_WIDTHS[key] ?? 20,
      }));
      for (const row of rows) {
        ws.addRow(
          activeColumns.map((key): string | number => {
            if (key === 'totalAmount') return row.totalAmount ? Number(row.totalAmount) : 0;
            if (key === 'invoiceDate') return row.invoiceDate ? formatDateOnly(row.invoiceDate) : '';
            return row[key] || '';
          }),
        );
      }

      const blob = new Blob([await wb.xlsx.writeBuffer()], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = buildReportFilename(filters, branches, clients);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`Hisobot yuklab olindi (${rows.length} ta yozuv)`);
    } catch (error: unknown) {
      console.error('Error generating invoice report:', error);
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(message || 'Hisobot yaratishda xatolik yuz berdi');
    } finally {
      setReportLoading(false);
    }
  };

  return { exportInvoiceReport, reportLoading };
};
