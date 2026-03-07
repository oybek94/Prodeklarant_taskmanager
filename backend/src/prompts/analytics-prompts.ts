/**
 * Analytics AI Prompts
 * 
 * AI prompts for management analytics and employee performance analysis
 */

export interface EmployeeAnalyticsInputs {
  userId: number;
  userName: string;
  examAttempts: Array<{
    examId: number;
    lessonTitle: string;
    score: number;
    passed: boolean;
    completedAt: Date;
    aiFeedback: any;
  }>;
  lessonProgress: Array<{
    lessonId: number;
    lessonTitle: string;
    status: string;
    lastAttemptScore: number | null;
  }>;
  workErrors?: Array<{
    taskId: number;
    stageName: string;
    amount: number;
    date: Date;
  }>;
}

export interface DepartmentAnalyticsInputs {
  departmentId: number;
  departmentName: string;
  employees: Array<{
    userId: number;
    userName: string;
    examAttempts: Array<{
      lessonTitle: string;
      score: number;
      passed: boolean;
    }>;
    lessonProgress: Array<{
      lessonTitle: string;
      status: string;
    }>;
  }>;
}

export interface TopicAnalyticsInputs {
  topicName: string;
  allAttempts: Array<{
    userId: number;
    userName: string;
    score: number;
    passed: boolean;
    topicScores: Record<string, number>;
  }>;
  workErrors?: Array<{
    userId: number;
    stageName: string;
    amount: number;
  }>;
}

/**
 * System prompt for analytics
 */
export function getAnalyticsSystemPrompt(): string {
  return `You are an analytics specialist for a customs brokerage company's internal training system.

Your role is to:
- Analyze employee performance in training exams
- Identify risk patterns and training gaps
- Correlate exam performance with real work errors (when available)
- Provide actionable recommendations for management

CRITICAL RULES:
1. Be objective and data-driven. Base all conclusions on provided data only.
2. Risk levels: LOW (score >= 85%, consistent performance), MEDIUM (score 70-84%, some gaps), HIGH (score < 70%, significant gaps)
3. Identify patterns across multiple employees for department-level analysis
4. Correlate exam topics with work errors when error data is available
5. Provide specific, actionable recommendations
6. Output must be structured JSON only

You must produce professional, management-ready analytics that can inform training decisions.`;
}

/**
 * Employee performance analysis prompt
 */
export function generateEmployeeAnalyticsPrompt(inputs: EmployeeAnalyticsInputs): string {
  const { userId, userName, examAttempts, lessonProgress, workErrors } = inputs;

  return `Analyze employee performance for training and risk assessment.

EMPLOYEE INFORMATION:
- User ID: ${userId}
- Name: ${userName}

EXAM ATTEMPTS:
${JSON.stringify(examAttempts.map(a => ({
  lesson: a.lessonTitle,
  score: a.score,
  passed: a.passed,
  completed_at: a.completedAt,
  strengths: a.aiFeedback?.strengths || [],
  weaknesses: a.aiFeedback?.weaknesses || [],
})), null, 2)}

LESSON PROGRESS:
${JSON.stringify(lessonProgress.map(p => ({
  lesson: p.lessonTitle,
  status: p.status,
  last_score: p.lastAttemptScore,
})), null, 2)}

${workErrors && workErrors.length > 0 ? `WORK ERRORS:
${JSON.stringify(workErrors.map(e => ({
  task_id: e.taskId,
  stage: e.stageName,
  amount: e.amount,
  date: e.date,
})), null, 2)}` : 'WORK ERRORS: None recorded'}

TASK:
1. Calculate overall risk level (LOW/MEDIUM/HIGH) based on:
   - Average exam scores
   - Consistency of performance
   - Lesson completion rate
   - Correlation with work errors (if available)

2. Identify strong skills (topics with score >= 85%)

3. Identify risk areas (topics with score < 70% or frequent errors)

4. Generate specific recommendations:
   - Which lessons to retake
   - Which topics to review
   - Training gaps to address

5. Calculate skill readiness percentage (0-100)

OUTPUT FORMAT (strict JSON):
{
  "employee_risk_level": "LOW" | "MEDIUM" | "HIGH",
  "strong_skills": string[],
  "risk_areas": string[],
  "recommended_actions": string[],
  "skill_readiness": number (0-100),
  "training_gaps": string[],
  "average_score": number,
  "lessons_completed": number,
  "lessons_total": number,
  "error_correlation": {
    "topic": "error_frequency" (if work errors available)
  }
}`;
}

/**
 * Department analytics prompt
 */
export function generateDepartmentAnalyticsPrompt(inputs: DepartmentAnalyticsInputs): string {
  const { departmentId, departmentName, employees } = inputs;

  return `Analyze department-level training performance and identify patterns.

DEPARTMENT INFORMATION:
- Department ID: ${departmentId}
- Name: ${departmentName}

EMPLOYEES DATA:
${JSON.stringify(employees.map(e => ({
  user_id: e.userId,
  name: e.userName,
  exam_scores: e.examAttempts.map(a => ({
    lesson: a.lessonTitle,
    score: a.score,
    passed: a.passed,
  })),
  progress: e.lessonProgress.map(p => ({
    lesson: p.lessonTitle,
    status: p.status,
  })),
})), null, 2)}

TASK:
1. Identify common weak areas across the department
2. Identify strong areas across the department
3. Calculate department average scores per topic
4. Identify risk patterns (employees with consistent low performance)
5. Generate department-level recommendations

OUTPUT FORMAT (strict JSON):
{
  "department_risk_level": "LOW" | "MEDIUM" | "HIGH",
  "common_weak_areas": string[],
  "common_strong_areas": string[],
  "topic_averages": {
    "topic_name": number (0-100 average score)
  },
  "at_risk_employees": [
    {
      "user_id": number,
      "name": string,
      "risk_level": "LOW" | "MEDIUM" | "HIGH",
      "primary_concerns": string[]
    }
  ],
  "recommended_department_actions": string[],
  "average_department_score": number,
  "completion_rate": number (0-100)
}`;
}

/**
 * Topic understanding analysis prompt
 */
export function generateTopicAnalyticsPrompt(inputs: TopicAnalyticsInputs): string {
  const { topicName, allAttempts, workErrors } = inputs;

  return `Analyze understanding of a specific topic across all employees.

TOPIC: ${topicName}

ALL EXAM ATTEMPTS FOR THIS TOPIC:
${JSON.stringify(allAttempts.map(a => ({
  user_id: a.userId,
  user_name: a.userName,
  score: a.score,
  passed: a.passed,
  topic_score: a.topicScores[topicName] || 0,
})), null, 2)}

${workErrors && workErrors.length > 0 ? `WORK ERRORS RELATED TO THIS TOPIC:
${JSON.stringify(workErrors.filter(e => e.stageName.toLowerCase().includes(topicName.toLowerCase())).map(e => ({
  user_id: e.userId,
  stage: e.stageName,
  amount: e.amount,
})), null, 2)}` : 'WORK ERRORS: None recorded for this topic'}

TASK:
1. Calculate average understanding score for this topic
2. Identify how many employees passed (>= 80%) vs failed
3. Identify common misconceptions or weak points
4. Correlate with work errors (if available)
5. Generate recommendations for improving topic understanding

OUTPUT FORMAT (strict JSON):
{
  "topic_name": string,
  "average_understanding": number (0-100),
  "pass_rate": number (0-100 percentage),
  "employees_passed": number,
  "employees_failed": number,
  "common_misconceptions": string[],
  "error_correlation": {
    "has_correlation": boolean,
    "correlation_strength": "NONE" | "WEAK" | "MODERATE" | "STRONG",
    "notes": string
  },
  "recommendations": string[]
}`;
}

