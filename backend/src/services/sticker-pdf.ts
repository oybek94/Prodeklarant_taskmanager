import PDFDocument from 'pdfkit';
import { prisma } from '../prisma';
import * as fs from 'fs';
import * as path from 'path';
import { isStickerReady } from './task-status';
import {
  TaskNotFoundError,
  StickerNotReadyError,
  QrTokenMissingError,
  QrGenerationError,
} from './sticker-errors';
import { generateQRCodeBuffer, QRErrorCorrectionLevel } from '../utils/qr-code';
import { Prisma } from '@prisma/client';

// ============================================================================
// Constants
// ============================================================================

const STICKER_DIMENSIONS = {
  widthMm: 60,
  heightMm: 40,
} as const;

const MM_TO_POINTS = 2.83465;

const STICKER_PADDING = 5;

const FONT_SIZES = {
  header: 10,
  plate: 9,
  date: 7,
} as const;

const LAYOUT_RATIOS = {
  qrSizeRatio: 0.45,
  qrHeightRatio: 0.7,
  textSpacing: 5,
  headerSpacing: 12,
  plateSpacing: 10,
} as const;

const QR_ERROR_CORRECTION_LEVEL: QRErrorCorrectionLevel = 'M';

const FONT_PATHS = [
  path.join(__dirname, '../fonts/DejaVuSans.ttf'),
  path.join(__dirname, '../../fonts/DejaVuSans.ttf'),
  'C:/Windows/Fonts/arial.ttf',
  'C:/Windows/Fonts/times.ttf',
] as const;

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

interface LayoutMetrics {
  widthPt: number;
  heightPt: number;
  padding: number;
  contentWidth: number;
  contentHeight: number;
  qrSize: number;
  qrX: number;
  qrY: number;
  textX: number;
  textY: number;
  textWidth: number;
}

type FontName = 'CyrillicFont' | 'Helvetica';

// PDFDocument instance type (PDFKit doesn't export instance type, so we infer it)
interface TextOptions {
  width?: number;
  align?: 'left' | 'center' | 'right' | 'justify';
}

interface ImageOptions {
  width?: number;
  height?: number;
}

type PDFDoc = {
  registerFont: (name: string, path: string) => void;
  font: (name: string) => PDFDoc;
  fontSize: (size: number) => PDFDoc;
  fillColor: (color: string) => PDFDoc;
  text: (text: string, x: number, y: number, options?: TextOptions) => PDFDoc;
  rect: (x: number, y: number, w: number, h: number) => PDFDoc;
  fillAndStroke: (fill: string, stroke: string) => PDFDoc;
  image: (buffer: Buffer, x: number, y: number, options?: ImageOptions) => PDFDoc;
  on: (event: 'data' | 'end' | 'error', handler: (data: Buffer | Error) => void) => void;
  end: () => void;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Fetches task with verification stage data
 */
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

/**
 * Validates task eligibility for sticker generation
 */
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

/**
 * Extracts vehicle plate number from task title
 * Format: "01 АВТО 40845FCA" -> "40845FCA"
 */
function parseVehiclePlate(title: string): string | null {
  if (!title) return null;
  const autoIndex = title.indexOf('АВТО');
  if (autoIndex === -1) return null;
  const afterAuto = title.substring(autoIndex + 4).trim();
  const plateMatch = afterAuto.match(/^\S+/);
  return plateMatch ? plateMatch[0] : null;
}

/**
 * Formats date for display (DD.MM.YYYY)
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Normalizes text for safe Cyrillic rendering
 * Uses NFC normalization for proper character composition
 */
function normalizeText(text: unknown): string {
  if (text === null || text === undefined) return '';
  try {
    return String(text).normalize('NFC');
  } catch {
    return String(text);
  }
}

/**
 * Registers Cyrillic font if available, returns font name
 */
function registerCyrillicFont(doc: PDFDoc): FontName {
  for (const fontPath of FONT_PATHS) {
    try {
      if (fs.existsSync(fontPath)) {
        doc.registerFont('CyrillicFont', fontPath);
        return 'CyrillicFont';
      }
    } catch {
      continue;
    }
  }
  return 'Helvetica';
}

/**
 * Builds QR verification URL from token
 */
function buildQrUrl(qrToken: string): string {
  const baseUrl =
    process.env.FRONTEND_URL ||
    process.env.API_BASE_URL ||
    'http://localhost:5173';
  return `${baseUrl}/q/${qrToken}`;
}

/**
 * Calculates all layout metrics for sticker
 */
function calculateLayout(
  dimensions: typeof STICKER_DIMENSIONS,
  padding: number
): LayoutMetrics {
  const widthPt = dimensions.widthMm * MM_TO_POINTS;
  const heightPt = dimensions.heightMm * MM_TO_POINTS;
  const contentWidth = widthPt - padding * 2;
  const contentHeight = heightPt - padding * 2;

  const qrSize = Math.min(
    contentHeight * LAYOUT_RATIOS.qrHeightRatio,
    contentWidth * LAYOUT_RATIOS.qrSizeRatio
  );
  const qrX = padding;
  const qrY = padding + (contentHeight - qrSize) / 2;

  const textX = padding + qrSize + LAYOUT_RATIOS.textSpacing;
  const textY = padding;
  const textWidth = contentWidth - qrSize - LAYOUT_RATIOS.textSpacing;

  return {
    widthPt,
    heightPt,
    padding,
    contentWidth,
    contentHeight,
    qrSize,
    qrX,
    qrY,
    textX,
    textY,
    textWidth,
  };
}

/**
 * Draws complete sticker layout on PDF document
 */
function drawStickerLayout(
  doc: PDFDoc,
  data: StickerData,
  layout: LayoutMetrics,
  fontName: FontName
): void {
  // Background
  doc
    .rect(0, 0, layout.widthPt, layout.heightPt)
    .fillAndStroke('white', 'black');

  // Header: ✔ TEKSHIRILDI
  let currentY = layout.textY;
  doc
    .fontSize(FONT_SIZES.header)
    .font('Helvetica-Bold')
    .fillColor('black')
    .text('✔ TEKSHIRILDI', layout.textX, currentY, {
      width: layout.textWidth,
      align: 'left',
    });
  currentY += LAYOUT_RATIOS.headerSpacing;

  // Vehicle plate
  if (data.vehiclePlate) {
    doc
      .fontSize(FONT_SIZES.plate)
      .font(fontName)
      .text(normalizeText(data.vehiclePlate), layout.textX, currentY, {
        width: layout.textWidth,
        align: 'left',
      });
    currentY += LAYOUT_RATIOS.plateSpacing;
  }

  // Verification date
  if (data.verificationDate) {
    const formattedDate = formatDate(data.verificationDate);
    doc
      .fontSize(FONT_SIZES.date)
      .font(fontName)
      .text(formattedDate, layout.textX, currentY, {
        width: layout.textWidth,
        align: 'left',
      });
  }
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Generates sticker PDF for a task
 * Size: 60mm x 40mm
 * Content: ✔ TEKSHIRILDI, vehicle plate, verification date, QR code
 * @param taskId - Task ID to generate sticker for
 * @returns Promise<Buffer> - PDF as buffer
 */
export async function generateStickerPDF(taskId: number): Promise<Buffer> {
  // Fetch and validate task
  const task = await getTaskForSticker(taskId);
  validateStickerEligibility(task);

  // Prepare sticker data
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

  // Calculate layout
  const layout = calculateLayout(STICKER_DIMENSIONS, STICKER_PADDING);

  // Create PDF document
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({
    size: [layout.widthPt, layout.heightPt],
    margin: 0,
    autoFirstPage: true,
    info: {
      Title: 'Sticker',
      Author: 'Pro Deklarant',
      Subject: 'Verification Sticker',
      Creator: 'Pro Deklarant System',
    },
  });

  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  // Register font
  const fontName = registerCyrillicFont(doc);

  // Generate QR code
  let qrBuffer: Buffer;
  try {
    qrBuffer = await generateQRCodeBuffer(qrUrl, {
      size: layout.qrSize,
      errorCorrectionLevel: QR_ERROR_CORRECTION_LEVEL,
    });
  } catch (error) {
    const cause = error instanceof Error ? error : new Error(String(error));
    throw new QrGenerationError(qrUrl, cause);
  }

  // Draw layout
  drawStickerLayout(doc, stickerData, layout, fontName);

  // Embed QR code
  doc.image(qrBuffer, layout.qrX, layout.qrY, {
    width: layout.qrSize,
    height: layout.qrSize,
  });

  // Set up Promise before ending stream
  const pdfPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on('error', (error) => {
      reject(error);
    });
  });

  doc.end();
  return pdfPromise;
}
