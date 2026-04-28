
-- Migration: Multi-Engine SQL Dialect Support
-- Adds per-engine SQL variants for lessons (demo SQL), problems
-- (starter / solution / schema SQL), problem hints, and problem solutions.
-- Supported dialects: 'universal' | 'postgres' | 'mysql' | 'sqlite'


-- 1. Dialect enum type

DO $$ BEGIN
  CREATE TYPE public.sql_dialect AS ENUM ('universal', 'postgres', 'mysql', 'sqlite');
EXCEPTION WHEN duplicate_object THEN null;
END $$;



-- 2. lesson_sql_variants
--    Replaces the single `demo_sql` column on `lessons`.
--    Each row holds one dialect's version of the demo SQL for a lesson.
--    dialect = 'universal' means it runs unchanged on all three engines.

CREATE TABLE IF NOT EXISTS public.lesson_sql_variants (
    id          serial PRIMARY KEY,
    lesson_id   integer NOT NULL
                  REFERENCES public.lessons(id) ON DELETE CASCADE,
    dialect     public.sql_dialect NOT NULL DEFAULT 'universal',
    sql_text    text NOT NULL,
    created_at  timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at  timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT lesson_sql_variants_unique UNIQUE (lesson_id, dialect)
);

CREATE INDEX IF NOT EXISTS idx_lesson_sql_variants_lesson_id
    ON public.lesson_sql_variants(lesson_id);

-- Migrate existing demo_sql values → universal variant
INSERT INTO public.lesson_sql_variants (lesson_id, dialect, sql_text)
SELECT id, 'universal', demo_sql
FROM public.lessons
WHERE demo_sql IS NOT NULL
ON CONFLICT (lesson_id, dialect) DO NOTHING;

-- Keep demo_sql column for now but mark it deprecated via comment.
-- Drop it in a later migration once all application code is updated.
COMMENT ON COLUMN public.lessons.demo_sql
    IS 'DEPRECATED — use lesson_sql_variants instead.';



-- 3. problem_sql_variants
--    Three variant types for each problem × dialect combination:
--      starter  – boilerplate shown to the student
--      solution – accepted correct answer(s)
--      schema   – DDL/seed used to set up the sandbox before running
--
--    dialect = 'universal' means the SQL works on all supported engines.

CREATE TYPE public.problem_sql_variant_type AS ENUM ('starter', 'solution', 'schema');

CREATE TABLE IF NOT EXISTS public.problem_sql_variants (
    id           serial PRIMARY KEY,
    problem_id   integer NOT NULL
                   REFERENCES public.problems(id) ON DELETE CASCADE,
    variant_type public.problem_sql_variant_type NOT NULL,
    dialect      public.sql_dialect NOT NULL DEFAULT 'universal',
    -- For solution variants this stores ONE accepted answer.
    -- Multiple accepted solutions → multiple rows with same (problem_id, 'solution', dialect).
    sql_text     text NOT NULL,
    -- Whether the result-set row order must match exactly (solution only).
    order_matters boolean DEFAULT false NOT NULL,
    sort_order   integer DEFAULT 0 NOT NULL, -- ordering among multiple solutions
    created_at   timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at   timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_problem_sql_variants_problem_id
    ON public.problem_sql_variants(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_sql_variants_lookup
    ON public.problem_sql_variants(problem_id, variant_type, dialect);

-- Migrate existing starter_sql → universal starter variant
INSERT INTO public.problem_sql_variants (problem_id, variant_type, dialect, sql_text)
SELECT id, 'starter', 'universal', starter_sql
FROM public.problems
WHERE starter_sql IS NOT NULL
ON CONFLICT DO NOTHING;

-- Migrate existing schema_sql → universal schema variant
INSERT INTO public.problem_sql_variants (problem_id, variant_type, dialect, sql_text)
SELECT id, 'schema', 'universal', schema_sql
FROM public.problems
WHERE schema_sql IS NOT NULL
ON CONFLICT DO NOTHING;

-- Migrate existing solution_sql JSONB array → universal solution variants
-- solution_sql is stored as a JSON array of strings e.g. ["SELECT ...", "SELECT ..."]
INSERT INTO public.problem_sql_variants (problem_id, variant_type, dialect, sql_text, sort_order)
SELECT
    p.id,
    'solution',
    'universal',
    sol.value,
    (sol.ordinality - 1)::integer
FROM public.problems p,
     jsonb_array_elements_text(p.solution_sql) WITH ORDINALITY AS sol(value, ordinality)
WHERE p.solution_sql IS NOT NULL
  AND jsonb_typeof(p.solution_sql) = 'array'
ON CONFLICT DO NOTHING;

-- Migrate problem_solutions.sql_text → add dialect column
ALTER TABLE public.problem_solutions
    ADD COLUMN IF NOT EXISTS dialect public.sql_dialect NOT NULL DEFAULT 'universal';

COMMENT ON COLUMN public.problems.starter_sql
    IS 'DEPRECATED — use problem_sql_variants instead.';
COMMENT ON COLUMN public.problems.solution_sql
    IS 'DEPRECATED — use problem_sql_variants instead.';
COMMENT ON COLUMN public.problems.schema_sql
    IS 'DEPRECATED — use problem_sql_variants instead.';



-- 4. problem_hints — add optional dialect column
--    NULL means the hint applies to all dialects.
--    Set to a specific dialect when the hint text references engine-specific syntax.

ALTER TABLE public.problem_hints
    ADD COLUMN IF NOT EXISTS dialect public.sql_dialect DEFAULT NULL;

COMMENT ON COLUMN public.problem_hints.dialect
    IS 'NULL = applies to all dialects; set to a specific dialect for engine-specific hints.';



-- 5. submissions — record which engine the user ran against

ALTER TABLE public.submissions
    ADD COLUMN IF NOT EXISTS engine public.sql_dialect DEFAULT NULL;



-- 6. track_exam_submissions — record engine used during exam SQL questions

ALTER TABLE public.track_exam_submissions
    ADD COLUMN IF NOT EXISTS engine public.sql_dialect DEFAULT NULL;



-- 7. Helper view: resolved_lesson_sql
--    For a given lesson + requested dialect, returns the most-specific variant
--    available, falling back to 'universal' if no engine-specific row exists.

CREATE OR REPLACE VIEW public.resolved_lesson_sql AS
SELECT DISTINCT ON (lesson_id, requested_dialect)
    lesson_id,
    dialect AS requested_dialect,
    sql_text,
    CASE WHEN dialect = 'universal' THEN 0 ELSE 1 END AS specificity
FROM (
    -- Cross join each variant with the dialects it should serve
    SELECT lsv.lesson_id, lsv.sql_text, lsv.dialect,
           unnest(ARRAY[
               lsv.dialect::text,
               CASE WHEN lsv.dialect = 'universal' THEN 'postgres' END,
               CASE WHEN lsv.dialect = 'universal' THEN 'mysql'    END,
               CASE WHEN lsv.dialect = 'universal' THEN 'sqlite'   END
           ]::public.sql_dialect[]) AS requested_dialect
    FROM public.lesson_sql_variants lsv
) sub
WHERE requested_dialect IS NOT NULL
ORDER BY lesson_id, requested_dialect, specificity DESC;

COMMENT ON VIEW public.resolved_lesson_sql IS
    'Returns the best-matching SQL variant for each (lesson, dialect) pair.
     Engine-specific rows take priority over universal ones.';



