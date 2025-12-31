/**
 * Lesson Progression Service
 * 
 * Handles lesson unlock logic and status calculation based on:
 * - Previous lesson completion
 * - Exam scores
 * - Sequential progression rules
 */

import { prisma } from '../prisma';
import { LessonStatus } from '@prisma/client';

export class LessonProgressionService {
  /**
   * Calculate lesson status for a user
   * 
   * Rules:
   * - First lesson (orderIndex = 1) is always AVAILABLE
   * - Lesson N+1 is unlocked only if Lesson N status = COMPLETED AND latest exam score >= 80
   * - Failed exam keeps lesson locked until retake passes
   */
  static async calculateLessonStatus(
    userId: number,
    lessonId: number
  ): Promise<LessonStatus> {
    try {
      // Get lesson details
      const lesson = await prisma.trainingStep.findUnique({
        where: { id: lessonId },
        include: {
          stage: {
            include: {
              training: true,
            },
          },
        },
      });

      if (!lesson) {
        throw new Error(`Lesson ${lessonId} not found`);
      }

      // Get or create lesson progress
      let progress = await prisma.lessonProgress.findUnique({
        where: {
          userId_lessonId: {
            userId,
            lessonId,
          },
        },
      });

      // If no progress exists, check if this is the first lesson
      if (!progress) {
        // Check if this is the first lesson in the training
        const firstLesson = await prisma.trainingStep.findFirst({
          where: {
            stageId: lesson.stageId,
          },
          orderBy: {
            orderIndex: 'asc',
          },
        });

        if (firstLesson?.id === lessonId) {
          // First lesson is always AVAILABLE
          progress = await prisma.lessonProgress.create({
            data: {
              userId,
              lessonId,
              status: LessonStatus.AVAILABLE,
            },
          });
          return LessonStatus.AVAILABLE;
        } else {
          // Not first lesson, check previous lesson
          const previousLesson = await prisma.trainingStep.findFirst({
            where: {
              stageId: lesson.stageId,
              orderIndex: {
                lt: lesson.orderIndex,
              },
            },
            orderBy: {
              orderIndex: 'desc',
            },
          });

          if (!previousLesson) {
            // No previous lesson found, lock this one
            progress = await prisma.lessonProgress.create({
              data: {
                userId,
                lessonId,
                status: LessonStatus.LOCKED,
              },
            });
            return LessonStatus.LOCKED;
          }

          // Check previous lesson status
          const previousProgress = await prisma.lessonProgress.findUnique({
            where: {
              userId_lessonId: {
                userId,
                lessonId: previousLesson.id,
              },
            },
          });

          if (!previousProgress || previousProgress.status !== LessonStatus.COMPLETED) {
            // Previous lesson not completed, lock this one
            progress = await prisma.lessonProgress.create({
              data: {
                userId,
                lessonId,
                status: LessonStatus.LOCKED,
              },
            });
            return LessonStatus.LOCKED;
          }

          // Previous lesson completed, check exam score
          const latestExam = await prisma.exam.findFirst({
            where: {
              lessonId: previousLesson.id,
            },
            orderBy: {
              createdAt: 'desc',
            },
          });

          if (latestExam) {
            const latestAttempt = await prisma.examAttempt.findFirst({
              where: {
                userId,
                examId: latestExam.id,
              },
              orderBy: {
                completedAt: 'desc',
              },
            });

            if (latestAttempt && latestAttempt.score >= 80 && latestAttempt.passed) {
              // Previous lesson passed, unlock this one
              progress = await prisma.lessonProgress.create({
                data: {
                  userId,
                  lessonId,
                  status: LessonStatus.AVAILABLE,
                },
              });
              return LessonStatus.AVAILABLE;
            }
          }

          // Previous lesson not passed, lock this one
          progress = await prisma.lessonProgress.create({
            data: {
              userId,
              lessonId,
              status: LessonStatus.LOCKED,
            },
          });
          return LessonStatus.LOCKED;
        }
      }

      // Progress exists, return current status
      return progress.status;
    } catch (error) {
      console.error('Error calculating lesson status:', error);
      throw error;
    }
  }

  /**
   * Check if lesson can be unlocked
   */
  static async canUnlockLesson(
    userId: number,
    lessonId: number
  ): Promise<{ canUnlock: boolean; reason?: string }> {
    try {
      const status = await this.calculateLessonStatus(userId, lessonId);
      
      if (status === LessonStatus.AVAILABLE || status === LessonStatus.IN_PROGRESS) {
        return { canUnlock: true };
      }

      if (status === LessonStatus.LOCKED) {
        // Get previous lesson to explain why locked
        const lesson = await prisma.trainingStep.findUnique({
          where: { id: lessonId },
        });

        if (!lesson) {
          return { canUnlock: false, reason: 'Lesson not found' };
        }

        const previousLesson = await prisma.trainingStep.findFirst({
          where: {
            stageId: lesson.stageId,
            orderIndex: {
              lt: lesson.orderIndex,
            },
          },
          orderBy: {
            orderIndex: 'desc',
          },
        });

        if (previousLesson) {
          const previousProgress = await prisma.lessonProgress.findUnique({
            where: {
              userId_lessonId: {
                userId,
                lessonId: previousLesson.id,
              },
            },
          });

          if (!previousProgress || previousProgress.status !== LessonStatus.COMPLETED) {
            return {
              canUnlock: false,
              reason: `Previous lesson "${previousLesson.title}" must be completed first`,
            };
          }

          // Check exam score
          const latestExam = await prisma.exam.findFirst({
            where: {
              lessonId: previousLesson.id,
            },
            orderBy: {
              createdAt: 'desc',
            },
          });

          if (latestExam) {
            const latestAttempt = await prisma.examAttempt.findFirst({
              where: {
                userId,
                examId: latestExam.id,
              },
              orderBy: {
                completedAt: 'desc',
              },
            });

            if (!latestAttempt || latestAttempt.score < 80 || !latestAttempt.passed) {
              return {
                canUnlock: false,
                reason: `Previous lesson exam must be passed with score >= 80% (current: ${latestAttempt?.score || 0}%)`,
              };
            }
          }
        }

        return { canUnlock: false, reason: 'Lesson is locked' };
      }

      return { canUnlock: false, reason: `Lesson status: ${status}` };
    } catch (error) {
      console.error('Error checking unlock status:', error);
      return { canUnlock: false, reason: 'Error checking unlock status' };
    }
  }

  /**
   * Mark lesson as IN_PROGRESS
   */
  static async startLesson(userId: number, lessonId: number): Promise<void> {
    try {
      const canUnlock = await this.canUnlockLesson(userId, lessonId);
      if (!canUnlock.canUnlock) {
        throw new Error(`Cannot start lesson: ${canUnlock.reason}`);
      }

      await prisma.lessonProgress.upsert({
        where: {
          userId_lessonId: {
            userId,
            lessonId,
          },
        },
        create: {
          userId,
          lessonId,
          status: LessonStatus.IN_PROGRESS,
        },
        update: {
          status: LessonStatus.IN_PROGRESS,
        },
      });
    } catch (error) {
      console.error('Error starting lesson:', error);
      throw error;
    }
  }

  /**
   * Update lesson status after exam attempt
   */
  static async updateLessonStatusAfterExam(
    userId: number,
    lessonId: number,
    examScore: number,
    passed: boolean
  ): Promise<void> {
    try {
      const newStatus = passed && examScore >= 80
        ? LessonStatus.COMPLETED
        : LessonStatus.FAILED;

      await prisma.lessonProgress.upsert({
        where: {
          userId_lessonId: {
            userId,
            lessonId,
          },
        },
        create: {
          userId,
          lessonId,
          status: newStatus,
          lastAttemptScore: examScore,
          completedAt: passed && examScore >= 80 ? new Date() : null,
        },
        update: {
          status: newStatus,
          lastAttemptScore: examScore,
          completedAt: passed && examScore >= 80 ? new Date() : null,
        },
      });

      // If lesson completed, unlock next lesson
      if (newStatus === LessonStatus.COMPLETED) {
        await this.unlockNextLesson(userId, lessonId);
      }
    } catch (error) {
      console.error('Error updating lesson status after exam:', error);
      throw error;
    }
  }

  /**
   * Unlock next lesson if previous is completed
   */
  private static async unlockNextLesson(
    userId: number,
    completedLessonId: number
  ): Promise<void> {
    try {
      const completedLesson = await prisma.trainingStep.findUnique({
        where: { id: completedLessonId },
      });

      if (!completedLesson) {
        return;
      }

      // Find next lesson
      const nextLesson = await prisma.trainingStep.findFirst({
        where: {
          stageId: completedLesson.stageId,
          orderIndex: {
            gt: completedLesson.orderIndex,
          },
        },
        orderBy: {
          orderIndex: 'asc',
        },
      });

      if (nextLesson) {
        // Check if next lesson can be unlocked
        const canUnlock = await this.canUnlockLesson(userId, nextLesson.id);
        if (canUnlock.canUnlock) {
          await prisma.lessonProgress.upsert({
            where: {
              userId_lessonId: {
                userId,
                lessonId: nextLesson.id,
              },
            },
            create: {
              userId,
              lessonId: nextLesson.id,
              status: LessonStatus.AVAILABLE,
            },
            update: {
              status: LessonStatus.AVAILABLE,
            },
          });
        }
      }
    } catch (error) {
      console.error('Error unlocking next lesson:', error);
      // Don't throw - this is a side effect
    }
  }

  /**
   * Get all lessons with their statuses for a user
   */
  static async getUserLessonsWithStatus(
    userId: number,
    stageId: number
  ): Promise<Array<{
    id: number;
    title: string;
    orderIndex: number;
    status: LessonStatus;
    lastAttemptScore: number | null;
  }>> {
    try {
      const lessons = await prisma.trainingStep.findMany({
        where: {
          stageId,
          isActive: true,
        },
        orderBy: {
          orderIndex: 'asc',
        },
      });

      const lessonsWithStatus = await Promise.all(
        lessons.map(async (lesson) => {
          const status = await this.calculateLessonStatus(userId, lesson.id);
          const progress = await prisma.lessonProgress.findUnique({
            where: {
              userId_lessonId: {
                userId,
                lessonId: lesson.id,
              },
            },
          });

          return {
            id: lesson.id,
            title: lesson.title,
            orderIndex: lesson.orderIndex,
            status,
            lastAttemptScore: progress?.lastAttemptScore || null,
          };
        })
      );

      return lessonsWithStatus;
    } catch (error) {
      console.error('Error getting user lessons with status:', error);
      throw error;
    }
  }
}

