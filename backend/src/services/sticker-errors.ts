/**
 * Custom error classes for sticker PDF generation
 * Provides context-aware error messages for better logging and debugging
 */

export class TaskNotFoundError extends Error {
  constructor(taskId: number) {
    super(`Task not found: ${taskId}`);
    this.name = 'TaskNotFoundError';
  }
}

export class StickerNotReadyError extends Error {
  constructor(taskId: number, status: string) {
    super(`Task ${taskId} is not ready for sticker generation. Current status: ${status}`);
    this.name = 'StickerNotReadyError';
  }
}

export class QrTokenMissingError extends Error {
  constructor(taskId: number) {
    super(`Task ${taskId} does not have a QR token`);
    this.name = 'QrTokenMissingError';
  }
}

export class QrGenerationError extends Error {
  public readonly cause: Error;

  constructor(url: string, cause: Error) {
    super(`QR code generation failed for URL: ${url}. Cause: ${cause.message}`);
    this.name = 'QrGenerationError';
    this.cause = cause;
  }
}
