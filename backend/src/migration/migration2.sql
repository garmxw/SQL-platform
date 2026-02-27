
CREATE TABLE solution_views (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    problem_id INTEGER REFERENCES problems(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, problem_id)
);

ALTER TABLE lessons
ADD COLUMN demo_sql TEXT;

ALTER TABLE users
ADD COLUMN xp INTEGER DEFAULT 100;

ALTER TABLE lessons
ADD COLUMN xp_reward INTEGER DEFAULT 10;

ALTER TABLE problems
ADD COLUMN xp_reward INTEGER DEFAULT 20;

ALTER TABLE problems 
ALTER COLUMN solution_sql TYPE JSONB 
USING to_jsonb(solution_sql);

CREATE UNIQUE INDEX IF NOT EXISTS user_progress_unique
ON user_progress (user_id, track_id);

CREATE UNIQUE INDEX IF NOT EXISTS unique_correct_submission
ON submissions (user_id, problem_id)
WHERE is_correct = TRUE;

ALTER TABLE user_progress RENAME TO user_track_progress;