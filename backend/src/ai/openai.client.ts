import OpenAI from 'openai';

/**
 * Singleton OpenAI client instance
 * 
 * Security:
 * - Reads OPENAI_API_KEY from process.env only
 * - Never logs API key (only validates presence)
 * - Fails fast if key is missing
 */
class OpenAIClient {
  private static instance: OpenAI | null = null;
  private static apiKey: string | null = null;

  /**
   * Get singleton OpenAI client instance
   * @throws Error if OPENAI_API_KEY is not set
   */
  static getClient(): OpenAI {
    if (!OpenAIClient.instance) {
      const apiKey = process.env.OPENAI_API_KEY;
      
      if (!apiKey || apiKey.trim() === '') {
        throw new Error(
          'OPENAI_API_KEY is not set in environment variables. ' +
          'Please set it in your .env file.'
        );
      }

      // Validate key format (should start with sk-)
      if (!apiKey.startsWith('sk-')) {
        console.warn('⚠️  Warning: OPENAI_API_KEY does not start with "sk-". Please verify the key is correct.');
      }

      OpenAIClient.apiKey = apiKey;
      OpenAIClient.instance = new OpenAI({
        apiKey: apiKey,
        // Timeout for API calls (120 seconds for exam generation)
        timeout: 120000,
      });

      // Log successful initialization (without exposing key)
      console.log(`✅ OpenAI client initialized (key length: ${apiKey.length})`);
    }

    return OpenAIClient.instance;
  }

  /**
   * Validate that API key is configured
   * @returns true if key is present, false otherwise
   */
  static isConfigured(): boolean {
    const apiKey = process.env.OPENAI_API_KEY;
    return !!(apiKey && apiKey.trim() !== '');
  }

  /**
   * Reset instance (useful for testing)
   */
  static reset(): void {
    OpenAIClient.instance = null;
    OpenAIClient.apiKey = null;
  }
}

export default OpenAIClient;

