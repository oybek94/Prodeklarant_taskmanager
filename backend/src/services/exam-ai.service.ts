/**
 * AI Exam Service
 * 
 * Handles AI-powered exam generation, answer evaluation, and feedback generation
 * using OpenAI GPT-4 API.
 */

import OpenAIClient from '../ai/openai.client';
import {
  getSystemPrompt,
  generateUserPrompt,
  generateEvaluatorPrompt,
  type UserPromptInputs,
  type EvaluatorPromptInputs,
} from '../prompts/exam-prompts';

export interface ExamGenerationResult {
  questions: Array<{
    id: string;
    type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TEXT';
    question: string;
    options?: string[];
    correct_answer: string | string[] | any;
    points: number;
    topic: string;
  }>;
  total_points: number;
  passing_score: number;
}

export interface AnswerEvaluationResult {
  score: number;
  passed: boolean;
  question_scores: Record<string, {
    correct: boolean;
    score: number;
    feedback: string;
  }>;
  topic_understanding: Record<string, number>;
}

export interface EvaluatorResult {
  score: number;
  passed: boolean;
  scoring_valid: boolean;
  scoring_notes?: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  topic_scores: Record<string, number>;
  suggested_review: string[];
}

export class ExamAIService {
  private static readonly MODEL = 'gpt-4-turbo-preview';
  private static readonly TEMPERATURE = 0.3; // Lower temperature for more deterministic output
  private static readonly MAX_TOKENS = 4000;
  private static readonly TIMEOUT = 120000; // 120 seconds timeout

  /**
   * Generate exam questions for a lesson
   */
  static async generateExam(
    lessonId: number,
    lessonTitle: string,
    lessonContent: string
  ): Promise<ExamGenerationResult> {
    try {
      const client = OpenAIClient.getClient();
      const systemPrompt = getSystemPrompt();
      const userPrompt = generateUserPrompt({
        lessonId,
        lessonTitle,
        lessonFullText: lessonContent,
      });

      const response = await client.chat.completions.create({
        model: this.MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: this.TEMPERATURE,
        max_tokens: this.MAX_TOKENS,
        response_format: { type: 'json_object' }, // Force JSON output
        timeout: this.TIMEOUT,
      }, {
        timeout: this.TIMEOUT,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(content) as ExamGenerationResult;

      // Validate result structure
      if (!result.questions || !Array.isArray(result.questions)) {
        throw new Error('Invalid exam generation result: missing questions array');
      }

      if (result.questions.length < 8 || result.questions.length > 12) {
        throw new Error(`Invalid exam generation result: expected 8-12 questions, got ${result.questions.length}`);
      }

      return result;
    } catch (error) {
      console.error('Error generating exam:', error);
      throw new Error(`Failed to generate exam: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Evaluate learner answers
   */
  static async evaluateAnswers(
    lessonId: number,
    lessonTitle: string,
    lessonContent: string,
    learnerAnswers: Record<string, any>
  ): Promise<AnswerEvaluationResult> {
    try {
      const client = OpenAIClient.getClient();
      const systemPrompt = getSystemPrompt();
      const userPrompt = generateUserPrompt(
        {
          lessonId,
          lessonTitle,
          lessonFullText: lessonContent,
          learnerAnswers,
        },
        true // Evaluation mode
      );

      const response = await client.chat.completions.create({
        model: this.MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: this.TEMPERATURE,
        max_tokens: this.MAX_TOKENS,
        response_format: { type: 'json_object' },
        timeout: this.TIMEOUT,
      }, {
        timeout: this.TIMEOUT,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(content) as AnswerEvaluationResult;

      // Validate result
      if (typeof result.score !== 'number' || result.score < 0 || result.score > 100) {
        throw new Error('Invalid evaluation result: score must be between 0 and 100');
      }

      if (typeof result.passed !== 'boolean') {
        throw new Error('Invalid evaluation result: passed must be boolean');
      }

      return result;
    } catch (error) {
      console.error('Error evaluating answers:', error);
      throw new Error(`Failed to evaluate answers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate scoring and generate comprehensive feedback
   */
  static async evaluateAttempt(inputs: EvaluatorPromptInputs): Promise<EvaluatorResult> {
    try {
      const client = OpenAIClient.getClient();
      const systemPrompt = getSystemPrompt();
      const evaluatorPrompt = generateEvaluatorPrompt(inputs);

      const response = await client.chat.completions.create({
        model: this.MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: evaluatorPrompt },
        ],
        temperature: this.TEMPERATURE,
        max_tokens: this.MAX_TOKENS,
        response_format: { type: 'json_object' },
        timeout: this.TIMEOUT,
      }, {
        timeout: this.TIMEOUT,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(content) as EvaluatorResult;

      // Validate result
      if (typeof result.score !== 'number' || result.score < 0 || result.score > 100) {
        throw new Error('Invalid evaluator result: score must be between 0 and 100');
      }

      if (!Array.isArray(result.strengths) || !Array.isArray(result.weaknesses)) {
        throw new Error('Invalid evaluator result: strengths and weaknesses must be arrays');
      }

      return result;
    } catch (error) {
      console.error('Error evaluating attempt:', error);
      throw new Error(`Failed to evaluate attempt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

