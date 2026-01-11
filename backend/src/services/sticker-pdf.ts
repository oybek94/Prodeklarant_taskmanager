import PDFDocument from 'pdfkit';
import { prisma } from '../prisma';
import * as fs from 'fs';
import * as path from 'path';
import { isStickerReady } from './task-status';

// Helper function to ensure text is a valid UTF-8 string
function ensureUTF8(text: any): string {
  if (text === null || text === undefined) return '';
  let result = String(text);
  try {
    result = result.normalize('NFC');
  } catch (e) {
    // Continue with original string
  }
  try {
    const utf8Buffer = Buffer.from(result, 'utf8');
    result = utf8Buffer.toString('utf8');
  } catch (e) {
    result = '';
  }
  return result;
}

// Parse vehicle plate number from task title
function parseVehiclePlate(title: string): string | null {
  if (!title) return null;
  const autoIndex = title.indexOf('АВТО');
  if (autoIndex === -1) return null;
  const afterAuto = title.substring(autoIndex + 4).trim();
  const plateMatch = afterAuto.match(/^\S+/);
  return plateMatch ? plateMatch[0] : null;
}

// Format date for display
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Generate sticker PDF for a task
 * Size: 60mm x 40mm
 * Content: ✔ TEKSHIRILDI, vehicle plate, verification date, QR code
 * Returns PDF as Buffer (safe for async operations)
 */
export async function generateStickerPDF(taskId: number): Promise<Buffer> {
  // Get task with required data
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
    throw new Error('Task not found');
  }

  if (!isStickerReady(task.status)) {
    throw new Error('Task is not ready for sticker generation');
  }

  if (!task.qrToken) {
    throw new Error('Task does not have a QR token');
  }

  // Parse vehicle plate
  const vehiclePlate = parseVehiclePlate(task.title);
  
  // Get verification date
  const verificationDate = task.stages.length > 0 && task.stages[0].completedAt
    ? task.stages[0].completedAt
    : null;

  // Sticker dimensions: 60mm x 40mm
  // Convert to points: 1mm = 2.83465 points
  const widthMm = 60;
  const heightMm = 40;
  const widthPt = widthMm * 2.83465; // ~170.08 points
  const heightPt = heightMm * 2.83465; // ~113.39 points

  // Create PDF document and set up buffer collection
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({
    size: [widthPt, heightPt],
    margin: 0,
    autoFirstPage: true,
    info: {
      Title: 'Sticker',
      Author: 'Pro Deklarant',
      Subject: 'Verification Sticker',
      Creator: 'Pro Deklarant System',
    },
  });

  // Set up buffer collection (listening to 'data' events puts stream in flowing mode)
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  // Register Cyrillic font (same pattern as invoice-pdf.ts)
  let fontRegistered = false;
  const fontPaths = [
    path.join(__dirname, '../fonts/DejaVuSans.ttf'),
    path.join(__dirname, '../../fonts/DejaVuSans.ttf'),
    'C:/Windows/Fonts/arial.ttf',
    'C:/Windows/Fonts/times.ttf',
  ];

  for (const fontPath of fontPaths) {
    try {
      if (fs.existsSync(fontPath)) {
        doc.registerFont('CyrillicFont', fontPath);
        doc.font('CyrillicFont');
        fontRegistered = true;
        break;
      }
    } catch (error) {
      // Continue to next font path
    }
  }

  if (!fontRegistered) {
    doc.font('Helvetica');
  }

  // Background color (optional white background)
  doc.rect(0, 0, widthPt, heightPt).fillAndStroke('white', 'black');

  // Padding
  const padding = 5;
  const contentWidth = widthPt - (padding * 2);
  const contentHeight = heightPt - (padding * 2);

  // Layout: QR code on left, text on right
  const qrSize = Math.min(contentHeight * 0.7, contentWidth * 0.45);
  const qrX = padding;
  const qrY = padding + (contentHeight - qrSize) / 2;
  
  const textX = padding + qrSize + 5;
  const textY = padding;
  const textWidth = contentWidth - qrSize - 5;

  // Generate QR code URL (construct the verification URL)
  const baseUrl = process.env.FRONTEND_URL || process.env.API_BASE_URL || 'http://localhost:5173';
  const qrUrl = `${baseUrl}/q/${task.qrToken}`;

  // Generate QR code (black, high contrast)
  // QR code generation is required - no fallback allowed
  let qrCodeDataUrl: string;
  try {
    const QRCodeModule = await import('qrcode');
    const QRCode = QRCodeModule.default || QRCodeModule;
    if (!QRCode || typeof QRCode.toDataURL !== 'function') {
      throw new Error('QRCode.toDataURL is not a function');
    }
    qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
      width: Math.round(qrSize),
      margin: 1,
      color: {
        dark: '#000000', // Black
        light: '#FFFFFF', // White
      },
      errorCorrectionLevel: 'M',
    });
  } catch (qrError: any) {
    console.error('QR code generation error:', qrError);
    throw new Error(`QR code generation failed: ${qrError.message}`);
  }

  // Convert data URL to buffer and embed in PDF
  const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
  const qrImageBuffer = Buffer.from(base64Data, 'base64');

  doc.image(qrImageBuffer, qrX, qrY, {
    width: qrSize,
    height: qrSize,
  });

  // Text content on the right
  let currentY = textY;

  // ✔ TEKSHIRILDI (bold, larger)
  doc.fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('black')
    .text('✔ TEKSHIRILDI', textX, currentY, {
      width: textWidth,
      align: 'left',
    });
  currentY += 12;

  // Vehicle plate (medium size)
  if (vehiclePlate) {
    doc.fontSize(9)
      .font(fontRegistered ? 'CyrillicFont' : 'Helvetica')
      .text(ensureUTF8(vehiclePlate), textX, currentY, {
        width: textWidth,
        align: 'left',
      });
    currentY += 10;
  }

  // Verification date (smaller)
  if (verificationDate) {
    const formattedDate = formatDate(verificationDate);
    doc.fontSize(7)
      .font(fontRegistered ? 'CyrillicFont' : 'Helvetica')
      .text(formattedDate, textX, currentY, {
        width: textWidth,
        align: 'left',
      });
  }

  // Set up Promise BEFORE calling end() to ensure listeners are attached
  const pdfPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on('error', (error) => {
      reject(error);
    });
  });

  // Finalize PDF (this triggers the stream to end)
  doc.end();

  // Wait for PDF buffer to be complete
  return pdfPromise;
}
