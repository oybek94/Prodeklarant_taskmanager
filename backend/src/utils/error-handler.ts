/**
 * Centralized error handler for AI operations
 * 
 * Categorizes OpenAI errors and returns user-safe messages
 * Logs detailed errors server-side for debugging
 */

export interface AIError {
  message: string;
  code: string;
}

/**
 * Handle AI-related errors and return user-safe error information
 * 
 * @param error Unknown error from AI operations
 * @returns Formatted error with message and code
 */
export function handleAIError(error: unknown): AIError {
  // Log full error details server-side
  console.error('[AI Error Handler]', error);

  // Handle OpenAI API errors
  if (error && typeof error === 'object' && 'status' in error) {
    const status = error.status as number;
    
    switch (status) {
      case 401:
        return {
          message: 'OpenAI API key is invalid or missing. Please check your configuration.',
          code: 'AUTH_ERROR',
        };
      case 429:
        return {
          message: 'OpenAI API rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT',
        };
      case 500:
      case 502:
      case 503:
        return {
          message: 'OpenAI API service is temporarily unavailable. Please try again later.',
          code: 'SERVICE_UNAVAILABLE',
        };
      default:
        return {
          message: `OpenAI API error (${status}). Please try again later.`,
          code: 'API_ERROR',
        };
    }
  }

  // Handle timeout errors
  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      return {
        message: 'AI analysis timed out. The document may be too large or complex. Please try again.',
        code: 'TIMEOUT',
      };
    }

    // Handle JSON parsing errors
    if (error.message.includes('JSON') || error.message.includes('parse')) {
      return {
        message: 'Failed to parse AI response. The document may be unclear or corrupted.',
        code: 'PARSE_ERROR',
      };
    }

    // Handle empty response errors
    if (error.message.includes('empty') || error.message.includes('no content')) {
      return {
        message: 'AI did not return a valid response. Please try again.',
        code: 'EMPTY_RESPONSE',
      };
    }

    // Generic error
    return {
      message: error.message || 'An unexpected error occurred during AI analysis.',
      code: 'UNKNOWN_ERROR',
    };
  }

  // Fallback for unknown error types
  return {
    message: 'An unexpected error occurred during AI analysis.',
    code: 'UNKNOWN_ERROR',
  };
}

