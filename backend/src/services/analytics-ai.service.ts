/**
 * Analytics AI Service
 * 
 * Handles AI-powered analytics for management dashboard
 */

import OpenAIClient from '../ai/openai.client';
import {
  getAnalyticsSystemPrompt,
  generateEmployeeAnalyticsPrompt,
  generateDepartmentAnalyticsPrompt,
  generateTopicAnalyticsPrompt,
  type EmployeeAnalyticsInputs,
  type DepartmentAnalyticsInputs,
  type TopicAnalyticsInputs,
} from '../prompts/analytics-prompts';
import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';

export interface EmployeeAnalyticsResult {
  employee_risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  strong_skills: string[];
  risk_areas: string[];
  recommended_actions: string[];
  skill_readiness: number;
  training_gaps: string[];
  average_score: number;
  lessons_completed: number;
  lessons_total: number;
  error_correlation?: Record<string, any>;
}

export interface DepartmentAnalyticsResult {
  department_risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  common_weak_areas: string[];
  common_strong_areas: string[];
  topic_averages: Record<string, number>;
  at_risk_employees: Array<{
    user_id: number;
    name: string;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
    primary_concerns: string[];
  }>;
  recommended_department_actions: string[];
  average_department_score: number;
  completion_rate: number;
}

export interface TopicAnalyticsResult {
  topic_name: string;
  average_understanding: number;
  pass_rate: number;
  employees_passed: number;
  employees_failed: number;
  common_misconceptions: string[];
  error_correlation: {
    has_correlation: boolean;
    correlation_strength: 'NONE' | 'WEAK' | 'MODERATE' | 'STRONG';
    notes: string;
  };
  recommendations: string[];
}

export class AnalyticsAIService {
  private static readonly MODEL = 'gpt-4-turbo-preview';
  private static readonly TEMPERATURE = 0.2; // Lower temperature for more deterministic analytics
  private static readonly MAX_TOKENS = 4000;

  /**
   * Analyze individual employee performance
   */
  static async analyzeEmployeePerformance(userId: number): Promise<EmployeeAnalyticsResult> {
    try {
      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Get all exam attempts
      const examAttempts = await prisma.examAttempt.findMany({
        where: { 
          userId,
        },
        include: {
          exam: {
            include: {
              lesson: true,
            },
          },
        },
        orderBy: {
          completedAt: 'desc',
        },
      });

      // Get lesson progress
      const lessonProgress = await prisma.lessonProgress.findMany({
        where: { userId },
        include: {
          lesson: true,
        },
      });

      // Get work errors (if available)
      const workErrors = await prisma.taskError.findMany({
        where: { workerId: userId },
        orderBy: {
          date: 'desc',
        },
        take: 50, // Last 50 errors
      });

      const inputs: EmployeeAnalyticsInputs = {
        userId,
        userName: user.name,
        examAttempts: examAttempts
          .filter(a => a.aiFeedback !== null)
          .map(a => ({
            examId: a.examId,
            lessonTitle: a.exam.lesson?.title || 'Unknown',
            score: a.score,
            passed: a.passed,
            completedAt: a.completedAt || a.startedAt,
            aiFeedback: a.aiFeedback as any,
          })),
        lessonProgress: lessonProgress.map(p => ({
          lessonId: p.lessonId,
          lessonTitle: p.lesson.title,
          status: p.status,
          lastAttemptScore: p.lastAttemptScore,
        })),
        workErrors: workErrors.map(e => ({
          taskId: e.taskId,
          stageName: e.stageName,
          amount: Number(e.amount),
          date: e.date,
        })),
      };

      const client = OpenAIClient.getClient();
      const systemPrompt = getAnalyticsSystemPrompt();
      const userPrompt = generateEmployeeAnalyticsPrompt(inputs);

      const response = await client.chat.completions.create({
        model: this.MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: this.TEMPERATURE,
        max_tokens: this.MAX_TOKENS,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(content) as EmployeeAnalyticsResult;

      // Validate result
      if (!['LOW', 'MEDIUM', 'HIGH'].includes(result.employee_risk_level)) {
        throw new Error('Invalid risk level in analytics result');
      }

      return result;
    } catch (error) {
      console.error('Error analyzing employee performance:', error);
      throw new Error(`Failed to analyze employee performance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze department performance
   */
  static async analyzeDepartment(departmentId: number): Promise<DepartmentAnalyticsResult> {
    try {
      // Get all users in department (by branch)
      const users = await prisma.user.findMany({
        where: {
          branchId: departmentId,
          active: true,
          role: {
            in: ['DEKLARANT', 'MANAGER', 'CERTIFICATE_WORKER'],
          },
        },
        include: {
          examAttempts: {
            include: {
              exam: {
                include: {
                  lesson: true,
                },
              },
            },
          },
          lessonProgress: {
            include: {
              lesson: true,
            },
          },
        },
      });

      if (users.length === 0) {
        throw new Error(`No active employees found in department ${departmentId}`);
      }

      // Get branch name
      const branch = await prisma.branch.findUnique({
        where: { id: departmentId },
      });

      // Get data for all employees (already included in users query)
      const employeesData = users.map((user) => ({
        userId: user.id,
        userName: user.name,
        examAttempts: user.examAttempts.map(a => ({
          lessonTitle: a.exam.lesson?.title || 'Unknown',
          score: a.score,
          passed: a.passed,
        })),
        lessonProgress: user.lessonProgress.map(p => ({
          lessonTitle: p.lesson.title,
          status: p.status,
        })),
      }));

      const inputs: DepartmentAnalyticsInputs = {
        departmentId,
        departmentName: branch?.name || `Department ${departmentId}`,
        employees: employeesData,
      };

      const client = OpenAIClient.getClient();
      const systemPrompt = getAnalyticsSystemPrompt();
      const userPrompt = generateDepartmentAnalyticsPrompt(inputs);

      const response = await client.chat.completions.create({
        model: this.MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: this.TEMPERATURE,
        max_tokens: this.MAX_TOKENS,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(content) as DepartmentAnalyticsResult;

      return result;
    } catch (error) {
      console.error('Error analyzing department:', error);
      throw new Error(`Failed to analyze department: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze topic understanding across all employees
   */
  static async analyzeTopicUnderstanding(topicName: string): Promise<TopicAnalyticsResult> {
    try {
      // Get all exam attempts that include this topic
      const allAttempts = await prisma.examAttempt.findMany({
        where: {
          aiFeedback: {
            not: Prisma.JsonNull,
          },
        },
        include: {
          exam: {
            include: {
              lesson: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Filter attempts that have topic scores for this topic
      const relevantAttempts = allAttempts
        .filter(a => {
          const feedback = a.aiFeedback as any;
          return feedback?.topic_scores && feedback.topic_scores[topicName] !== undefined;
        })
        .map(a => ({
          userId: a.userId,
          userName: a.user?.name || 'Unknown',
          score: a.score,
          passed: a.passed,
          topicScores: (a.aiFeedback as any)?.topic_scores || {},
        }));

      // Get work errors related to this topic
      const workErrors = await prisma.taskError.findMany({
        where: {
          stageName: {
            contains: topicName,
            mode: 'insensitive',
          },
        },
        include: {
          worker: true,
        },
      });

      const inputs: TopicAnalyticsInputs = {
        topicName,
        allAttempts: relevantAttempts,
        workErrors: workErrors.map(e => ({
          userId: e.workerId,
          stageName: e.stageName,
          amount: Number(e.amount),
        })),
      };

      const client = OpenAIClient.getClient();
      const systemPrompt = getAnalyticsSystemPrompt();
      const userPrompt = generateTopicAnalyticsPrompt(inputs);

      const response = await client.chat.completions.create({
        model: this.MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: this.TEMPERATURE,
        max_tokens: this.MAX_TOKENS,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(content) as TopicAnalyticsResult;

      return result;
    } catch (error) {
      console.error('Error analyzing topic understanding:', error);
      throw new Error(`Failed to analyze topic understanding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

