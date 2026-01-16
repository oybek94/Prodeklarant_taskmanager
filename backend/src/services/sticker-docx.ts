import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  ImageRun,
  PageOrientation,
} from 'docx';
import { prisma } from '../prisma';
import {
  TaskNotFoundError,
  StickerNotReadyError,
  QrTokenMissingError,
  QrGenerationError,
} from './sticker-errors';
import { generateQRCodeBuffer } from '../utils/qr-code';
import { isStickerReady } from './task-status';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

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
 * Generates sticker DOCX for a task
 * @param taskId - Task ID to generate sticker for
 * @returns Promise<Buffer> - DOCX as buffer
 */
export async function generateStickerDOCX(taskId: number): Promise<Buffer> {
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

  // Generate QR code as buffer (smaller size for compact sticker)
  let qrBuffer: Buffer;
  try {
    qrBuffer = await generateQRCodeBuffer(qrUrl, {
      size: 100,
      errorCorrectionLevel: 'M',
    });
  } catch (error) {
    const cause = error instanceof Error ? error : new Error(String(error));
    throw new QrGenerationError(qrUrl, cause);
  }

  // Load logo image
  let logoBuffer: Buffer | null = null;
  const logoPaths = [
    path.join(__dirname, '../../../frontend/public/logo.png'),
    path.join(__dirname, '../../../../frontend/public/logo.png'),
    path.join(process.cwd(), 'frontend/public/logo.png'),
  ];
  for (const logoPath of logoPaths) {
    try {
      if (fs.existsSync(logoPath)) {
        logoBuffer = fs.readFileSync(logoPath);
        break;
      }
    } catch (error) {
      // Continue to next path
    }
  }

  // Create document content without any tables
  // Layout: Logo at top (centered), text on left, QR code on right
  const children: Paragraph[] = [];

  // 1. Logo at the top (centered, boxed)
  if (logoBuffer) {
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: logoBuffer,
            type: 'png',
            transformation: {
              width: 100,
              height: 20,
            },
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 60, before: 0, line: 240 },
        keepNext: true,
        border: {
          top: { style: 'single', size: 6, color: '000000' },
          bottom: { style: 'single', size: 6, color: '000000' },
          left: { style: 'single', size: 6, color: '000000' },
          right: { style: 'single', size: 6, color: '000000' },
        },
      })
    );
  }

  // 2. Vehicle plate (large, bold, black) - left aligned
  if (stickerData.vehiclePlate) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: stickerData.vehiclePlate,
            size: 32,
            bold: true,
            color: '000000',
          }),
        ],
        alignment: AlignmentType.LEFT,
        spacing: { after: 40, before: 0, line: 240 },
        keepNext: true,
      })
    );
  }

  // 3. "Tekshiruvdan o'tgan" (small, light gray) - left aligned
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Tekshiruvdan o\'tgan',
          size: 18,
          color: '808080', // Light gray
        }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: 30, before: 0, line: 240 },
      keepNext: true,
    })
  );

  // 4. "Elektron hujjatlar uchun QR kodni skanerlang" (slightly larger, darker gray) - left aligned
  // Using tab to position QR code on right
  const qrTextParts: (TextRun | ImageRun)[] = [
    new TextRun({
      text: 'Elektron hujjatlar uchun',
      size: 7,
      bold: true,
      color: '606060', // Darker gray
    }),
    new TextRun({ text: '\n', size: 20 }),
    new TextRun({
      text: 'QR kodni skanerlang',
      size: 7,
      bold: true,
      color: '606060',
    }),
    new TextRun({ text: '\t', size: 20 }),
    new ImageRun({
      data: qrBuffer,
      type: 'png',
      transformation: {
        width: 55,
        height: 55,
      },
    }),
  ];

  children.push(
    new Paragraph({
      children: qrTextParts,
      alignment: AlignmentType.LEFT,
      spacing: { after: 0, before: 0, line: 240 },
      keepLines: true,
      tabStops: [
        {
          type: 'right' as const,
          position: Math.round(51 * 56.693), // 51mm in twips
        },
      ],
    })
  );

  // Create document
  // 58mm x 40mm in twentieths of a point (landscape orientation)
  // 1 inch = 25.4mm, 1 inch = 1440 twips (twentieths of a point)
  // 1mm = 1440/25.4 = 56.693 twips
  // IMPORTANT: In DOCX with PageOrientation.LANDSCAPE, Word internally swaps width/height
  // So for landscape 58mm x 40mm, we set width=40mm and height=58mm
  // Word will then display and print it as 58mm (width) x 40mm (height) in landscape
  const desiredWidth58mm = Math.round(58 * 56.693); // 58mm (desired width in landscape)
  const desiredHeight40mm = Math.round(40 * 56.693); // 40mm (desired height in landscape)
  const margin2mm = Math.round(2 * 56.693); // 2mm margin (smaller for compact sticker)

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
              // When orientation is LANDSCAPE, Word swaps these internally
              // So we set width=40mm (becomes height after swap) and height=58mm (becomes width after swap)
              // Result: 58mm width x 40mm height in landscape orientation
              width: desiredHeight40mm, // 40mm - will become height in landscape
              height: desiredWidth58mm, // 58mm - will become width in landscape
            },
            margin: {
              top: margin2mm,
              bottom: margin2mm,
              left: margin2mm,
              right: margin2mm,
            },
          },
        },
        children,
      },
    ],
  });

  // Generate DOCX buffer
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}
