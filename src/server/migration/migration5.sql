
-- VORN DB MIGRATION
-- Run this once against your existing database.
-- Every statement is purely additive — no existing column,
-- table, or constraint is dropped or changed.
-- Safe to run while the existing application is running.




-- 1. Enhance existing tables with new columns


-- lessons: add XP penalty fields and a flag marking whether
-- the lesson body is authored as markdown (always true going forward,
-- but the flag lets you distinguish legacy plain-text rows).
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS hint_xp_penalty    INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS solution_xp_penalty INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS is_published        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags                TEXT[]; -- e.g. '{SELECT,WHERE}'


-- problems: add time limit, tags, XP penalties, and flags that
-- distinguish "standalone" problems (problems page) from
-- lesson-embedded ones. Both types share this table.
ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS time_limit_seconds   INTEGER,           -- NULL = no limit
  ADD COLUMN IF NOT EXISTS hint_xp_penalty      INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS solution_xp_penalty  INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS is_standalone         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_published          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags                  TEXT[],
  ADD COLUMN IF NOT EXISTS schema_sql            TEXT,             -- CREATE TABLE setup for the editor
  ADD COLUMN IF NOT EXISTS acceptance_rate       NUMERIC(5,2);     -- cached, updated by a background job


-- tracks: add passing threshold and certificate eligibility flag.
ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS pass_threshold         INTEGER NOT NULL DEFAULT 85,
  ADD COLUMN IF NOT EXISTS cert_threshold          INTEGER NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS track_order             INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_published            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cover_image_url         TEXT,
  ADD COLUMN IF NOT EXISTS prerequisite_track_id   INTEGER REFERENCES tracks(id) ON DELETE SET NULL;


-- badges: add more metadata for the badge editor.
ALTER TABLE badges
  ADD COLUMN IF NOT EXISTS is_active      BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS criteria_json  JSONB;
  -- criteria_json stores the conditions that award this badge,
  -- e.g. {"type": "streak", "value": 7} or {"type": "problems_solved", "value": 50}
  -- The badge award service reads this to decide when to grant a badge.



-- 2. New table: problem_hints
-- Stores ordered hints for any problem (lesson or standalone).
-- Admins can add multiple hints per problem; the frontend
-- reveals them one at a time.

CREATE TABLE IF NOT EXISTS problem_hints (
  id          SERIAL PRIMARY KEY,
  problem_id  INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  hint_order  INTEGER NOT NULL DEFAULT 1,
  content     TEXT    NOT NULL,            -- markdown text shown to the student
  xp_penalty  INTEGER NOT NULL DEFAULT 5,  -- per-hint override (falls back to problems.hint_xp_penalty)
  created_at  TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_problem_hints_problem_id ON problem_hints(problem_id);



-- 3. New table: problem_solutions
-- Stores the official solution(s) for a problem.
-- A problem can have multiple accepted solutions (e.g. multiple
-- valid SQL dialects).

CREATE TABLE IF NOT EXISTS problem_solutions (
  id           SERIAL PRIMARY KEY,
  problem_id   INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  explanation  TEXT,             -- markdown explanation shown after solving
  sql_text     TEXT NOT NULL,    -- the canonical accepted SQL
  created_at   TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_problem_solutions_problem_id ON problem_solutions(problem_id);



-- 4. New table: track_exams
-- One exam per track. The exam is unlocked after the student
-- finishes all lessons in the track.
-- The exam contains both quiz questions and one or more hard
-- problems that require knowledge of this track + all prior ones.

CREATE TABLE IF NOT EXISTS track_exams (
  id                   SERIAL PRIMARY KEY,
  track_id             INTEGER NOT NULL UNIQUE REFERENCES tracks(id) ON DELETE CASCADE,
  title                VARCHAR NOT NULL,
  description          TEXT,
  time_limit_seconds   INTEGER NOT NULL DEFAULT 3600,  -- 1 hour default
  pass_threshold       INTEGER NOT NULL DEFAULT 85,    -- minimum % to pass to next track
  cert_threshold       INTEGER NOT NULL DEFAULT 90,    -- minimum % to earn a certificate
  total_points         INTEGER NOT NULL DEFAULT 0,     -- sum of all question/problem points
  is_published         BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);



-- 5. New table: exam_questions
-- Quiz questions for a track exam.
-- Type can be 'multiple_choice', 'true_false', or 'sql_problem'
-- (for linked problems). SQL problems reference the problems
-- table via linked_problem_id.

CREATE TABLE IF NOT EXISTS exam_questions (
  id                  SERIAL PRIMARY KEY,
  exam_id             INTEGER NOT NULL REFERENCES track_exams(id) ON DELETE CASCADE,
  question_order      INTEGER NOT NULL DEFAULT 1,
  question_type       VARCHAR NOT NULL DEFAULT 'multiple_choice',
                      -- allowed values: 'multiple_choice', 'true_false', 'sql_problem'
  question_text       TEXT    NOT NULL,
  points              INTEGER NOT NULL DEFAULT 10,
  linked_problem_id   INTEGER REFERENCES problems(id) ON DELETE SET NULL,
                      -- populated only when question_type = 'sql_problem'
  created_at          TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_id ON exam_questions(exam_id);



-- 6. New table: exam_choices
-- Answer choices for multiple_choice and true_false questions.

CREATE TABLE IF NOT EXISTS exam_choices (
  id           SERIAL PRIMARY KEY,
  question_id  INTEGER NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
  choice_text  TEXT    NOT NULL,
  is_correct   BOOLEAN NOT NULL DEFAULT false,
  choice_order INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_exam_choices_question_id ON exam_choices(question_id);



-- 7. New table: track_exam_submissions
-- Records each student's attempt at a track exam.
-- Only one passing attempt is needed; multiple attempts are
-- allowed but the best score is used.

CREATE TABLE IF NOT EXISTS track_exam_submissions (
  id              SERIAL PRIMARY KEY,
  exam_id         INTEGER NOT NULL REFERENCES track_exams(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  submitted_at    TIMESTAMP WITHOUT TIME ZONE,
  score           INTEGER,              -- raw points earned
  score_percent   NUMERIC(5,2),         -- (score / total_points) * 100
  passed          BOOLEAN,
  cert_eligible   BOOLEAN DEFAULT false,
  answers_json    JSONB,                -- snapshot of all answers for audit
  timed_out       BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_track_exam_submissions_user ON track_exam_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_track_exam_submissions_exam ON track_exam_submissions(exam_id);



-- 8. New table: certificates
-- Auto-generated when a student passes the final track exam
-- with a score >= cert_threshold AND has completed 100% of
-- all lessons across all tracks.

CREATE TABLE IF NOT EXISTS certificates (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_id         INTEGER NOT NULL REFERENCES track_exams(id) ON DELETE CASCADE,
  score_percent   NUMERIC(5,2) NOT NULL,
  issued_at       TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  cert_uuid       UUID NOT NULL DEFAULT gen_random_uuid(),
  UNIQUE (user_id, exam_id)   -- one certificate per user per exam
);

CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);



-- 9. New table: problem_tags
-- Normalised tag table so tags can be queried and filtered
-- across both lesson problems and standalone problems.

CREATE TABLE IF NOT EXISTS problem_tags (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR NOT NULL UNIQUE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS problem_tag_links (
  problem_id  INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  tag_id      INTEGER NOT NULL REFERENCES problem_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (problem_id, tag_id)
);



-- 10. user_exam_question_answers
-- Stores per-question answers within an exam submission so the
-- admin can review each student's work.

CREATE TABLE IF NOT EXISTS user_exam_question_answers (
  id              SERIAL PRIMARY KEY,
  submission_id   INTEGER NOT NULL REFERENCES track_exam_submissions(id) ON DELETE CASCADE,
  question_id     INTEGER NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
  selected_choice INTEGER REFERENCES exam_choices(id) ON DELETE SET NULL,
  sql_answer      TEXT,        -- filled when question_type = 'sql_problem'
  is_correct      BOOLEAN,
  points_earned   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_user_exam_answers_submission ON user_exam_question_answers(submission_id);



-- NOTES FOR INTEGRATION
--
-- 1. gen_random_uuid() requires the pgcrypto extension.
--    Run once: CREATE EXTENSION IF NOT EXISTS pgcrypto;
--
-- 2. The problems.solution_sql column (jsonb) was in the
--    original schema. We now also have problem_solutions for
--    structured, multi-solution storage. Both coexist without
--    conflict — the original jsonb column is untouched.
--
-- 3. The existing lessons.content column stores the lesson
--    markdown body (the full .md text). No change needed.
--    demo_sql stays as the starter SQL shown in the editor.
--
-- 4. track_exam_submissions.timed_out = true is set by the
--    backend when the student's timer expires before they
--    submit manually.
--
-- 5. Certificate issuance logic:
--    a. Student submits a track exam with score_percent >= cert_threshold.
--    b. Backend checks: is this the LAST track? Are all lesson
--       completions 100% across all tracks?
--    c. If both true, INSERT into certificates (UPSERT safe due
--       to UNIQUE constraint).
--    d. Frontend can then render/download the PDF certificate.
