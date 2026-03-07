import { prisma } from '../prisma';
import path from 'path';
import { writeCmrToFile } from './cmr-excel';

const sanitizeFileName = (value: string) =>
  value.replace(/[\\/:*?"<>|]+/g, '_');

const getContractForInvoice = async (invoice: {
  contractId?: number | null;
  contractNumber?: string | null;
  clientId?: number | null;
}) => {
  if (invoice.contractId) {
    return prisma.contract.findUnique({ where: { id: invoice.contractId } });
  }
  if (invoice.contractNumber && invoice.clientId) {
    return prisma.contract.findFirst({
      where: {
        contractNumber: invoice.contractNumber,
        clientId: invoice.clientId,
      },
    });
  }
  return null;
};

export const ensureCmrForInvoice = async (params: {
  invoiceId: number;
  uploadedById: number;
}) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.invoiceId },
    include: {
      items: {
        orderBy: { orderIndex: 'asc' },
      },
      client: true,
      task: true,
      branch: true,
    },
  });

  if (!invoice) {
    throw new Error('Invoice topilmadi');
  }

  const contract = await getContractForInvoice(invoice);
  const safeNumber = sanitizeFileName(invoice.invoiceNumber);
  const fileName = `CMR_${safeNumber}.xlsx`;
  const outputPath = await writeCmrToFile(
    {
      invoice,
      items: invoice.items,
      contract,
    },
    fileName
  );

  const fileUrl = path.posix.join('/uploads/cmr', fileName);
  // CMR/SMR shabloni Hujjatlar bo'limiga avtomatik qo'shilmaydi - faqat yuklab olish

  return { fileName, fileUrl, outputPath };
};
