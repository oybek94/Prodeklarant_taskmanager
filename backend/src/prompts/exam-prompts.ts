/**
 * AI Exam System Prompts
 * 
 * This file contains all three prompts required for the AI-powered exam system:
 * 1. System Prompt - Defines AI behavior and constraints
 * 2. User Prompt - Generates questions and evaluates answers
 * 3. Evaluator Prompt - Validates scoring and generates feedback
 */

// ============================================================================
// 1️⃣ SYSTEM PROMPT
// ============================================================================
export function getSystemPrompt(): string {
  return `You are an instructor and examiner for an internal training system at Prodeklarant, a customs brokerage company.

CRITICAL RULES:
1. You act ONLY as an instructor and examiner. You do not provide hints, explanations before scoring, or external knowledge.
2. You use ONLY the provided lesson content. You must not hallucinate, add external knowledge, or reference information not explicitly stated in the lesson.
3. You evaluate understanding, not memorization. Focus on whether the learner comprehends concepts, not whether they can recite exact phrases.
4. You must produce structured, machine-readable JSON output. No markdown, no explanations outside the JSON structure.
5. Maintain a neutral, professional tone. No encouragement, no criticism, only objective assessment.
6. Do not provide hints or explanations before scoring. The learner must demonstrate understanding without assistance.

Your role is to:
- Generate questions that test comprehension of the lesson content
- Evaluate learner answers objectively
- Calculate scores based on correctness and understanding
- Identify strengths and weaknesses in understanding
- Provide actionable feedback for improvement

You must be strict but fair. A score of 80% or higher indicates passing understanding.`;
}

// ============================================================================
// 2️⃣ USER PROMPT (Question Generation and Answer Evaluation)
// ============================================================================
export interface UserPromptInputs {
  lessonId: number;
  lessonTitle: string;
  lessonFullText: string;
  learnerAnswers?: Record<string, any>; // Optional: if evaluating existing answers
}

export function generateUserPrompt(inputs: UserPromptInputs, isEvaluation: boolean = false): string {
  const { lessonId, lessonTitle, lessonFullText, learnerAnswers } = inputs;

  if (isEvaluation && learnerAnswers) {
    // Evaluation mode: Evaluate provided answers
    return `Evaluate the learner's answers for lesson "${lessonTitle}" (ID: ${lessonId}).

LESSON CONTENT:
${lessonFullText}

LEARNER ANSWERS (JSON format):
${JSON.stringify(learnerAnswers, null, 2)}

TASK:
1. Evaluate each answer for correctness and understanding
2. Calculate a score from 0-100 based on:
   - Correctness of answers (70% weight)
   - Demonstration of understanding vs. memorization (30% weight)
3. Determine if the learner passed (score >= 80)
4. Identify which topics the learner understood well
5. Identify which topics need improvement

OUTPUT FORMAT (strict JSON):
{
  "score": number (0-100),
  "passed": boolean,
  "question_scores": {
    "question_id": {
      "correct": boolean,
      "score": number (0-100),
      "feedback": string
    }
  },
  "topic_understanding": {
    "topic_name": number (0-100 percentage)
  }
}`;
  } else {
    // Question generation mode: Generate 8-12 questions
    return `Generate an exam for lesson "${lessonTitle}" (ID: ${lessonId}).

LESSON CONTENT:
${lessonFullText}

TASK:
Generate 8-12 questions that test understanding of the lesson content. Questions should:
1. Cover different sections of the lesson
2. Mix question types: single choice, multiple choice, and text-based
3. Test comprehension, not memorization
4. Be clear and unambiguous
5. Have correct answers that can be verified from the lesson content

QUESTION DISTRIBUTION:
- 40% single choice questions
- 30% multiple choice questions  
- 30% text-based questions (short answer)

OUTPUT FORMAT (strict JSON):
{
  "questions": [
    {
      "id": string (unique identifier),
      "type": "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TEXT",
      "question": string,
      "options": string[] (for SINGLE_CHOICE and MULTIPLE_CHOICE),
      "correct_answer": string | string[] | string (for TEXT: expected answer key points),
      "points": number (default: 1),
      "topic": string (which section/topic this tests)
    }
  ],
  "total_points": number,
  "passing_score": number (default: 80)
}`;
  }
}

// ============================================================================
// 3️⃣ EVALUATOR PROMPT (Consistency Validation and Feedback Generation)
// ============================================================================
export interface EvaluatorPromptInputs {
  attemptId: number;
  examId: number;
  lessonTitle: string;
  lessonContent: string;
  questions: Array<{
    id: string;
    question: string;
    type: string;
    correctAnswer: any;
  }>;
  learnerAnswers: Record<string, any>;
  questionScores: Record<string, { correct: boolean; score: number; feedback: string }>;
  overallScore: number;
  passed: boolean;
}

export function generateEvaluatorPrompt(inputs: EvaluatorPromptInputs): string {
  const {
    attemptId,
    examId,
    lessonTitle,
    lessonContent,
    questions,
    learnerAnswers,
    questionScores,
    overallScore,
    passed,
  } = inputs;

  return `You are a quality evaluator for an exam attempt. Validate scoring consistency and generate comprehensive feedback.

EXAM ATTEMPT DETAILS:
- Attempt ID: ${attemptId}
- Exam ID: ${examId}
- Lesson: "${lessonTitle}"
- Overall Score: ${overallScore}%
- Passed: ${passed}

LESSON CONTENT:
${lessonContent}

QUESTIONS AND CORRECT ANSWERS:
${JSON.stringify(questions.map(q => ({
  id: q.id,
  question: q.question,
  type: q.type,
  correct_answer: q.correctAnswer,
})), null, 2)}

LEARNER ANSWERS:
${JSON.stringify(learnerAnswers, null, 2)}

QUESTION SCORES:
${JSON.stringify(questionScores, null, 2)}

TASK:
1. Validate scoring consistency:
   - Check if question scores align with answer correctness
   - Verify overall score calculation is accurate
   - Identify any scoring inconsistencies

2. Analyze topic understanding:
   - Group questions by topic/section
   - Calculate topic-level scores
   - Identify strong topics (score >= 80%)
   - Identify weak topics (score < 80%)

3. Generate comprehensive feedback:
   - List strengths (topics understood well)
   - List weaknesses (topics needing improvement)
   - Provide specific recommendations for improvement
   - Suggest which lessons to review

OUTPUT FORMAT (strict JSON):
{
  "score": number (validated score, 0-100),
  "passed": boolean,
  "scoring_valid": boolean,
  "scoring_notes": string (if inconsistencies found),
  "strengths": string[] (list of topics/skills demonstrated well),
  "weaknesses": string[] (list of topics/skills needing improvement),
  "recommendation": string (actionable recommendation for the learner),
  "topic_scores": {
    "topic_name": number (0-100 percentage)
  },
  "suggested_review": string[] (specific sections or concepts to review)
}`;
}

