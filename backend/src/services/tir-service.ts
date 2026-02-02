import { prisma } from '../prisma';
import { DocumentType } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';
import { writeTirToFile } from './tir-excel';

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

const upsertTirTaskDocument = async (params: {
  taskId: number;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  uploadedById: number;
}) => {
  const existing = await prisma.taskDocument.findFirst({
    where: { taskId: params.taskId, documentType: DocumentType.TIR },
  });
  if (existing) {
    return prisma.taskDocument.update({
      where: { id: existing.id },
      data: {
        name: params.fileName,
        fileUrl: params.fileUrl,
        fileType: 'xlsx',
        fileSize: params.fileSize,
        description: 'TIR Excel',
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
      description: 'TIR Excel',
      documentType: DocumentType.TIR,
      uploadedById: params.uploadedById,
    },
  });
};

export const ensureTirForInvoice = async (params: {
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
  const fileName = `TIR_${safeNumber}.xlsx`;
  const outputPath = await writeTirToFile(
    {
      invoice,
      items: invoice.items,
      contract,
    },
    fileName
  );

  const stat = await fs.stat(outputPath);
  const fileUrl = path.posix.join('/uploads/tir', fileName);
  if (invoice.taskId) {
    await upsertTirTaskDocument({
      taskId: invoice.taskId,
      fileUrl,
      fileName,
      fileSize: stat.size,
      uploadedById: params.uploadedById,
    });
  }

  return { fileName, fileUrl, outputPath };
};
