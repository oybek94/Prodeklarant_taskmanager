import { prisma } from '../prisma';
import { DocumentType } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';
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

const upsertCmrTaskDocument = async (params: {
  taskId: number;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  uploadedById: number;
}) => {
  const existing = await prisma.taskDocument.findFirst({
    where: { taskId: params.taskId, documentType: DocumentType.CMR },
  });
  if (existing) {
    return prisma.taskDocument.update({
      where: { id: existing.id },
      data: {
        name: params.fileName,
        fileUrl: params.fileUrl,
        fileType: 'xlsx',
        fileSize: params.fileSize,
        description: 'CMR Excel',
      },
    });
  }
  return prisma.taskDocument.create({
    data: {
      taskId: params.taskId,
      name: params.fileName,
      fileUrl: params.fileUrl,
      fileType: 'xlsx',
      fileSize: params.fileSize,
      description: 'CMR Excel',
      documentType: DocumentType.CMR,
      uploadedById: params.uploadedById,
    },
  });
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

  const stat = await fs.stat(outputPath);
  const fileUrl = path.posix.join('/uploads/cmr', fileName);
  if (invoice.taskId) {
    await upsertCmrTaskDocument({
      taskId: invoice.taskId,
      fileUrl,
      fileName,
      fileSize: stat.size,
      uploadedById: params.uploadedById,
    });
  }

  return { fileName, fileUrl, outputPath };
};
