-- MIGRATION: Add sql_dialect enum + variant tables + missing columns
-- Run this once against your database to bring the schema in sync
-- with adminContentRouter.js

-- 1. sql_dialect enum type
DO $$ BEGIN
  CREATE TYPE public.sql_dialect AS ENUM ('universal', 'postgres', 'mysql', 'sqlite');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. lesson_sql_variants  (multi-dialect demo SQL per lesson)
CREATE TABLE IF NOT EXISTS public.lesson_sql_variants (
  id          serial PRIMARY KEY,
  lesson_id   integer NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  dialect     public.sql_dialect NOT NULL,
  sql_text    text NOT NULL,
  updated_at  timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT lesson_sql_variants_lesson_id_dialect_key UNIQUE (lesson_id, dialect)
);

-- 3. problem_sql_variants  (starter / schema / solution per dialect)
CREATE TABLE IF NOT EXISTS public.problem_sql_variants (
  id           serial PRIMARY KEY,
  problem_id   integer NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  variant_type varchar(20) NOT NULL CHECK (variant_type IN ('starter','schema','solution')),
  dialect      public.sql_dialect NOT NULL,
  sql_text     text NOT NULL,
  sort_order   integer DEFAULT 0 NOT NULL,
  updated_at   timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  -- unique constraint for starter + schema (one row per dialect)
  -- solutions allow multiple rows (sort_order differentiates them)
  CONSTRAINT problem_sql_variants_simple_key
    UNIQUE (problem_id, variant_type, dialect)
    WHERE (variant_type IN ('starter', 'schema'))
);

-- 4. Add dialect column to problem_hints (nullable – hint can be dialect-specific)
ALTER TABLE public.problem_hints
  ADD COLUMN IF NOT EXISTS dialect public.sql_dialect;

-- 5. Add dialect column to problem_solutions
ALTER TABLE public.problem_solutions
  ADD COLUMN IF NOT EXISTS dialect public.sql_dialect DEFAULT 'universal';

-- 6. lessons: add missing columns referenced by the router
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS description   text,
  ADD COLUMN IF NOT EXISTS learning_goals text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS objectives    text[] DEFAULT '{}';

