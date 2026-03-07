-- Migration: add LMS models (levels, courses, modules, lessons, media, exams, results, progress, stream sessions)
-- NOTE: This SQL mirrors Prisma models added to schema.prisma. Run with psql or let prisma migrate apply a generated migration after review.

BEGIN;

-- Ensure pgcrypto (for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enum types
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lmsrole') THEN
    CREATE TYPE "LmsRole" AS ENUM ('ADMIN','LEARNER');
  END IF;
END$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mediatype') THEN
    CREATE TYPE "MediaType" AS ENUM ('VIDEO','AUDIO','IMAGE','FILE');
  END IF;
END$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transcodestatus') THEN
    CREATE TYPE "TranscodeStatus" AS ENUM ('QUEUED','PROCESSING','DONE','FAILED');
  END IF;
END$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'examtype') THEN
    CREATE TYPE "ExamType" AS ENUM ('SYSTEM','PRACTICAL');
  END IF;
END$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'questiontype') THEN
    CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE','TRUE_FALSE','MATCHING');
  END IF;
END$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'examstatus') THEN
    CREATE TYPE "ExamStatus" AS ENUM ('PENDING','PASSED','FAILED');
  END IF;
END$$;

-- Levels
CREATE TABLE IF NOT EXISTS "LmsLevel" (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  "orderIndex" INT NOT NULL DEFAULT 0,
  description TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "LmsLevel_order_idx" ON "LmsLevel"("orderIndex");

-- User profile
CREATE TABLE IF NOT EXISTS "LmsUserProfile" (
  id SERIAL PRIMARY KEY,
  "userId" INT NOT NULL UNIQUE REFERENCES "User"(id) ON DELETE CASCADE,
  role "LmsRole" NOT NULL DEFAULT 'LEARNER',
  "currentLevelId" INT REFERENCES "LmsLevel"(id),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "LmsUserProfile_role_idx" ON "LmsUserProfile"(role);

-- Courses / Modules / Lessons
CREATE TABLE IF NOT EXISTS "LmsCourse" (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  "requiredLevelId" INT REFERENCES "LmsLevel"(id),
  "isPublished" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdById" INT REFERENCES "User"(id),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "LmsCourse_requiredLevel_idx" ON "LmsCourse"("requiredLevelId");

CREATE TABLE IF NOT EXISTS "LmsModule" (
  id SERIAL PRIMARY KEY,
  "courseId" INT NOT NULL REFERENCES "LmsCourse"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  "orderIndex" INT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "LmsModule_course_order_uq" ON "LmsModule"("courseId","orderIndex");

CREATE TABLE IF NOT EXISTS "LmsLesson" (
  id SERIAL PRIMARY KEY,
  "moduleId" INT NOT NULL REFERENCES "LmsModule"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB,
  "orderIndex" INT NOT NULL DEFAULT 0,
  "requiresCompletion" BOOLEAN NOT NULL DEFAULT TRUE,
  "minWatchPercent" INT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "LmsLesson_module_order_uq" ON "LmsLesson"("moduleId","orderIndex");

-- Media
CREATE TABLE IF NOT EXISTS "LmsLessonMedia" (
  id SERIAL PRIMARY KEY,
  "lessonId" INT NOT NULL REFERENCES "LmsLesson"(id) ON DELETE CASCADE,
  type "MediaType" NOT NULL,
  "storageKey" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "sizeBytes" BIGINT,
  "durationSeconds" INT,
  "hlsManifestKey" TEXT,
  variant JSONB,
  protected BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "LmsLessonMedia_lesson_idx" ON "LmsLessonMedia"("lessonId");

-- Transcodes
CREATE TABLE IF NOT EXISTS "LmsMediaTranscode" (
  id SERIAL PRIMARY KEY,
  "mediaId" INT NOT NULL REFERENCES "LmsLessonMedia"(id) ON DELETE CASCADE,
  "jobId" TEXT UNIQUE,
  status "TranscodeStatus" NOT NULL,
  result JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stream sessions
CREATE TABLE IF NOT EXISTS "LmsMediaStreamSession" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" INT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "mediaId" INT NOT NULL REFERENCES "LmsLessonMedia"(id) ON DELETE CASCADE,
  "sessionToken" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  "clientIp" INET,
  "userAgent" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "LmsMediaStreamSession_user_idx" ON "LmsMediaStreamSession"("userId");
CREATE INDEX IF NOT EXISTS "LmsMediaStreamSession_media_idx" ON "LmsMediaStreamSession"("mediaId");

-- Exams / Questions / Results
CREATE TABLE IF NOT EXISTS "LmsExam" (
  id SERIAL PRIMARY KEY,
  "courseId" INT REFERENCES "LmsCourse"(id),
  "moduleId" INT REFERENCES "LmsModule"(id),
  title TEXT NOT NULL,
  type "ExamType" NOT NULL,
  "passingScore" INT NOT NULL DEFAULT 70,
  "attemptsAllowed" INT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  "createdById" INT REFERENCES "User"(id),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "LmsExamQuestion" (
  id SERIAL PRIMARY KEY,
  "examId" INT NOT NULL REFERENCES "LmsExam"(id) ON DELETE CASCADE,
  "questionType" "QuestionType" NOT NULL,
  prompt JSONB NOT NULL,
  options JSONB,
  points INT NOT NULL DEFAULT 1,
  "correctAnswer" JSONB
);
CREATE INDEX IF NOT EXISTS "LmsExamQuestion_exam_idx" ON "LmsExamQuestion"("examId");

CREATE TABLE IF NOT EXISTS "LmsExamResult" (
  id SERIAL PRIMARY KEY,
  "examId" INT NOT NULL REFERENCES "LmsExam"(id) ON DELETE CASCADE,
  "userId" INT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "attemptNumber" INT NOT NULL DEFAULT 1,
  "scorePercent" NUMERIC(5,2),
  details JSONB,
  status "ExamStatus" NOT NULL,
  "gradedById" INT REFERENCES "User"(id),
  "gradedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "LmsExamResult_user_idx" ON "LmsExamResult"("userId");
CREATE INDEX IF NOT EXISTS "LmsExamResult_exam_idx" ON "LmsExamResult"("examId");

-- User progress
CREATE TABLE IF NOT EXISTS "LmsUserProgress" (
  id SERIAL PRIMARY KEY,
  "userId" INT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "lessonId" INT NOT NULL REFERENCES "LmsLesson"(id) ON DELETE CASCADE,
  "completedAt" TIMESTAMPTZ,
  "watchAggregates" JSONB,
  "lastHeartbeatAt" TIMESTAMPTZ,
  "examResultId" INT REFERENCES "LmsExamResult"(id),
  UNIQUE("userId","lessonId")
);
CREATE INDEX IF NOT EXISTS "LmsUserProgress_user_idx" ON "LmsUserProgress"("userId");

-- Sequence locks
CREATE TABLE IF NOT EXISTS "LmsLessonSequenceLock" (
  id SERIAL PRIMARY KEY,
  "lessonId" INT UNIQUE NOT NULL REFERENCES "LmsLesson"(id) ON DELETE CASCADE,
  "unlockAfterLessonId" INT REFERENCES "LmsLesson"(id)
);

COMMIT;
