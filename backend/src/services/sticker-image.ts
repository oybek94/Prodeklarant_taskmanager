import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import {
  TaskNotFoundError,
  StickerNotReadyError,
  QrTokenMissingError,
  QrGenerationError,
} from './sticker-errors';
import { generateQRCodeBuffer } from '../utils/qr-code';
import { isStickerReady } from './task-status';
import * as fs from 'fs';
import * as path from 'path';
import { Resvg } from '@resvg/resvg-js';

// ============================================================================
// Type Definitions
// ============================================================================

type TaskWithStages = Prisma.TaskGetPayload<{
  include: {
    stages: {
      where: { name: 'Tekshirish' };
      select: { completedAt: true };
    };
  };
}>;

interface StickerData {
  taskId: number;
  vehiclePlate: string | null;
  verificationDate: Date | null;
  qrToken: string;
  qrUrl: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function getTaskForSticker(taskId: number): Promise<TaskWithStages> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      stages: {
        where: { name: 'Tekshirish' },
        select: { completedAt: true },
      },
    },
  });

  if (!task) {
    throw new TaskNotFoundError(taskId);
  }

  return task;
}

function validateStickerEligibility(
  task: TaskWithStages
): asserts task is TaskWithStages & { qrToken: string } {
  if (!isStickerReady(task.status)) {
    throw new StickerNotReadyError(task.id, task.status);
  }

  if (!task.qrToken) {
    throw new QrTokenMissingError(task.id);
  }
}

function parseVehiclePlate(title: string): string | null {
  if (!title) return null;
  const autoIndex = title.indexOf('АВТО');
  if (autoIndex === -1) return null;
  const afterAuto = title.substring(autoIndex + 4).trim();
  const plateMatch = afterAuto.match(/^\S+/);
  return plateMatch ? plateMatch[0] : null;
}

function buildQrUrl(qrToken: string): string {
  const baseUrl =
    process.env.FRONTEND_URL ||
    process.env.PUBLIC_BASE_URL ||
    'https://app.prodeklarant.uz';
  return `${baseUrl}/q/${qrToken}`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function loadLogoBase64(): string | null {
  const logoPaths = [
    path.join(__dirname, '../../../frontend/public/logo.png'),
    path.join(__dirname, '../../../../frontend/public/logo.png'),
    path.join(process.cwd(), 'frontend/public/logo.png'),
  ];
  for (const logoPath of logoPaths) {
    try {
      if (fs.existsSync(logoPath)) {
        const buffer = fs.readFileSync(logoPath);
        return buffer.toString('base64');
      }
    } catch {
      // Continue to next path
    }
  }
  return null;
}

function loadFontBase64(): string | null {
  const fontPaths = [
    path.join(__dirname, '../fonts/Montserrat-Bold.ttf'),
    path.join(__dirname, '../../fonts/Montserrat-Bold.ttf'),
    path.join(process.cwd(), 'backend/src/fonts/Montserrat-Bold.ttf'),
  ];
  for (const fontPath of fontPaths) {
    try {
      if (fs.existsSync(fontPath)) {
        const buffer = fs.readFileSync(fontPath);
        return buffer.toString('base64');
      }
    } catch {
      // Continue to next path
    }
  }
  return null;
}

function buildStickerSvg(
  data: StickerData,
  qrBase64: string,
  logoBase64?: string | null,
  fontBase64?: string | null,
  pixelWidth?: number,
  pixelHeight?: number
): string {
  const width = 58;
  const height = 40;
  const margin = 2;

  const logoBoxX = margin;
  const logoBoxY = margin;
  const logoBoxW = width - margin * 2;
  const logoBoxH = 8;

  const logoW = 32;
  const logoH = 7;
  const logoX = (width - logoW) / 2;
  const logoY = logoBoxY + 1;

  const plateX = margin + 2;
  const plateY = 20;

  const subtitleX = plateX;
  const subtitleY = 26.5;

  const dateX = plateX;
  const dateY = 29.8;

  const infoX = plateX;
  const infoY1 = 33.6;
  const infoY2 = 37.4;

  const qrSize = 16;
  const qrX = width - margin - qrSize;
  const qrY = 22.5;

  const safePlate = data.vehiclePlate ?? '';
  const safeDate = formatDate(data.verificationDate);
  const fontStyle = fontBase64
    ? `<style>@font-face{font-family:'Montserrat';src:url(data:font/ttf;base64,${fontBase64}) format('truetype');font-weight:700;font-style:normal;}svg{text-rendering:geometricPrecision;}text{font-family:'Montserrat',sans-serif;font-weight:700;}</style>`
    : `<style>svg{text-rendering:geometricPrecision;}text{font-family:'Montserrat',sans-serif;font-weight:700;}</style>`;
  const svgWidth = pixelWidth ? `${pixelWidth}` : `${width}mm`;
  const svgHeight = pixelHeight ? `${pixelHeight}` : `${height}mm`;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${width} ${height}">
  ${fontStyle}
  <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />
  ${logoBase64 ? `<image href="data:image/png;base64,${logoBase64}" x="${logoX}" y="${logoY}" width="${logoW}" height="${logoH}" />` : ''}
  <text x="${plateX}" y="${plateY}" font-size="8.5" fill="#111111">${safePlate}</text>
  <text x="${subtitleX}" y="${subtitleY}" font-size="3.2" fill="#111111">Tekshiruvdan o&apos;tgan</text>
  ${safeDate ? `<text x="${dateX}" y="${dateY}" font-size="2.6" fill="#111111">Sana: ${safeDate}</text>` : ''}
  <text x="${infoX}" y="${infoY1}" font-size="2.6" fill="#111111">Elektron hujjatlar uchun</text>
  <text x="${infoX}" y="${infoY2}" font-size="2.6" fill="#111111">QR kodni skanerlang</text>
  <image href="data:image/png;base64,${qrBase64}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" />
</svg>
`.trim();
}

export async function generateStickerImage(taskId: number): Promise<Buffer> {
  const task = await getTaskForSticker(taskId);
  validateStickerEligibility(task);

  const vehiclePlate = parseVehiclePlate(task.title);
  const verificationDate =
    task.stages.length > 0 && task.stages[0].completedAt
      ? task.stages[0].completedAt
      : null;
  const qrUrl = buildQrUrl(task.qrToken);

  const stickerData: StickerData = {
    taskId: task.id,
    vehiclePlate,
    verificationDate,
    qrToken: task.qrToken,
    qrUrl,
  };

  let qrBuffer: Buffer;
  try {
    qrBuffer = await generateQRCodeBuffer(qrUrl, {
      size: 400,
      errorCorrectionLevel: 'H',
      margin: 2,
    });
  } catch (error) {
    const cause = error instanceof Error ? error : new Error(String(error));
    throw new QrGenerationError(qrUrl, cause);
  }

  const qrBase64 = qrBuffer.toString('base64');
  const logoBase64 = loadLogoBase64();
  const fontBase64 = loadFontBase64();

  const dpi = 300;
  const widthPx = Math.round((58 / 25.4) * dpi);
  const heightPx = Math.round((40 / 25.4) * dpi);

  const svg = buildStickerSvg(
    stickerData,
    qrBase64,
    logoBase64,
    fontBase64,
    widthPx,
    heightPx
  );

  const resvg = new Resvg(svg, { fitTo: { mode: 'original' } });
  const pngData = resvg.render();
  return pngData.asPng();
}
