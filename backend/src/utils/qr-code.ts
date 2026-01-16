/**
 * QR code generation utility
 * Provides reusable QR code generation with validation and error handling
 */

export type QRErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export interface QRCodeOptions {
  size: number;
  errorCorrectionLevel?: QRErrorCorrectionLevel;
  margin?: number;
}

/**
 * Validates URL format
 */
function validateUrl(url: string): void {
  try {
    new URL(url);
  } catch {
    throw new Error(`Invalid URL format: ${url}`);
  }
}

/**
 * Generates QR code as Buffer
 * @param url - URL to encode in QR code
 * @param options - QR code generation options
 * @returns Promise<Buffer> - QR code image as PNG buffer
 * @throws Error if URL is invalid or QR generation fails
 */
export async function generateQRCodeBuffer(
  url: string,
  options: QRCodeOptions
): Promise<Buffer> {
  validateUrl(url);

  const { size, errorCorrectionLevel = 'M', margin = 1 } = options;

  try {
    const QRCodeModule = await import('qrcode');
    const QRCode = QRCodeModule.default || QRCodeModule;

    if (!QRCode || typeof QRCode.toDataURL !== 'function') {
      throw new Error('QRCode.toDataURL is not a function');
    }

    const qrDataUrl = await QRCode.toDataURL(url, {
      width: Math.round(size),
      margin,
      errorCorrectionLevel,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  } catch (error) {
    const cause = error instanceof Error ? error : new Error(String(error));
    throw new Error(`QR code generation failed: ${cause.message}`);
  }
}
