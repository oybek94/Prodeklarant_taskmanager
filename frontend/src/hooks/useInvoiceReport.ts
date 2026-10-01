import { useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../lib/api';
import { REPORT_COLUMNS } from '../components/tasks/ArchiveFiltersPanel';
import type { InvoicesFilters } from '../components/invoices/types';
import { formatDateOnly } from '../utils/dateFormatting';

// Arxiv hisoboti ustunlari + valyuta (invoyslar turli valyutada bo'lishi mumkin)
export const INVOICE_REPORT_COLUMNS = {
  ...REPORT_COLUMNS,
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

export const useInvoiceReport = (filters: InvoicesFilters, searchQuery: string) => {
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

      const excelData = rows.map((row) => {
        const obj: Record<string, string | number> = {};
        for (const key of activeColumns) {
          const label = INVOICE_REPORT_COLUMNS[key];
          if (key === 'totalAmount') {
            obj[label] = row.totalAmount ? Number(row.totalAmount) : 0;
          } else if (key === 'invoiceDate') {
            obj[label] = row.invoiceDate ? formatDateOnly(row.invoiceDate) : '';
          } else {
            obj[label] = row[key] || '';
          }
        }
        return obj;
      });

      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(excelData);
      ws['!cols'] = activeColumns.map((key) => ({ wch: COLUMN_WIDTHS[key] ?? 20 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Hisobot');

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Invoyslar_Hisobot_${dateStr}.xlsx`);
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
