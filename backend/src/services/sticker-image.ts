import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import {
  TaskNotFoundError,
  QrTokenMissingError,
  QrGenerationError,
} from './sticker-errors';
import { generateQRCodeBuffer } from '../utils/qr-code';
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
}> & {
  qrToken: string | null;
};

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
    select: {
      id: true,
      title: true,
      qrToken: true,
      stages: {
        where: { name: 'Tekshirish' },
        select: { completedAt: true },
      },
    },
  });

  if (!task) {
    throw new TaskNotFoundError(taskId);
  }

  return task as TaskWithStages;
}

function validateStickerEligibility(
  task: TaskWithStages
): asserts task is TaskWithStages & { qrToken: string } {
  // Status check removed - allow sticker generation for any task status
  // Only check for qrToken presence (should be generated in route if missing)
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
    // Production build paths (compiled JavaScript in dist/) - CHECK FIRST
    path.join(__dirname, '../fonts/Montserrat-Bold.ttf'), // dist/services -> dist/fonts
    path.join(__dirname, '../../fonts/Montserrat-Bold.ttf'), // dist/services -> dist/fonts (alternative)
    // Absolute path for server - CHECK EARLY
    '/var/www/app/backend/src/fonts/Montserrat-Bold.ttf',
    '/var/www/app/backend/dist/fonts/Montserrat-Bold.ttf',
    // Source paths (TypeScript/Development)
    path.join(__dirname, '../../src/fonts/Montserrat-Bold.ttf'),
    // Common server deployment paths
    path.join(process.cwd(), 'backend/src/fonts/Montserrat-Bold.ttf'),
    path.join(process.cwd(), 'backend/dist/fonts/Montserrat-Bold.ttf'),
    path.join(process.cwd(), 'src/fonts/Montserrat-Bold.ttf'),
    path.join(process.cwd(), 'dist/fonts/Montserrat-Bold.ttf'),
    // Other absolute paths
    '/app/backend/src/fonts/Montserrat-Bold.ttf',
    '/app/backend/dist/fonts/Montserrat-Bold.ttf',
    '/app/src/fonts/Montserrat-Bold.ttf',
    '/app/dist/fonts/Montserrat-Bold.ttf',
  ];
  
  // Log debug info for production
  console.log(`[Sticker] Font loading: cwd=${process.cwd()}, __dirname=${__dirname}`);
  
  for (const fontPath of fontPaths) {
    try {
      if (fs.existsSync(fontPath)) {
        const buffer = fs.readFileSync(fontPath);
        const base64 = buffer.toString('base64');
        console.log(`[Sticker] ✅ Font loaded from: ${fontPath} (size: ${buffer.length} bytes, base64: ${base64.length} chars)`);
        return base64;
      } else {
        console.log(`[Sticker] ❌ Font not found at: ${fontPath}`);
      }
    } catch (error) {
      console.log(`[Sticker] ⚠️ Error checking font path ${fontPath}:`, error);
    }
  }
  
  // Log warning if font not found
  console.warn(`[Sticker] ⚠️ Montserrat-Bold.ttf not found in any path! Checked ${fontPaths.length} paths.`);
  console.warn(`[Sticker] Current working directory: ${process.cwd()}, __dirname: ${__dirname}`);
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
  
  // Improved font-face syntax for better Resvg compatibility
  const fontStyle = fontBase64
    ? `<defs>
  <style type="text/css">
    @font-face {
      font-family: 'Montserrat';
      src: url('data:font/truetype;charset=utf-8;base64,${fontBase64}') format('truetype');
      font-weight: 700;
      font-style: normal;
      font-display: block;
    }
  </style>
</defs>
<style type="text/css">
  svg {
    text-rendering: geometricPrecision;
  }
  text {
    font-family: 'Montserrat', 'Arial', 'Helvetica', sans-serif;
    font-weight: 700;
  }
</style>`
    : `<style type="text/css">
  svg {
    text-rendering: geometricPrecision;
  }
  text {
    font-family: 'Montserrat', 'Arial', 'Helvetica', sans-serif;
    font-weight: 700;
  }
</style>`;
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
  
  // Debug: log font loading result
  if (fontBase64) {
    console.log(`[Sticker] Font loaded successfully (base64 length: ${fontBase64.length})`);
  } else {
    console.warn(`[Sticker] ⚠️ Font NOT loaded - will use fallback sans-serif font`);
  }

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
