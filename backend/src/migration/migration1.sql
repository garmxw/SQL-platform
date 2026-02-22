-- first migration :

CREATE TABLE IF NOT EXISTS lessons (
    id SERIAL PRIMARY KEY,
    track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,

    title VARCHAR(150) NOT NULL,
    content TEXT NOT NULL,          -- markdown or html
    lesson_order INTEGER NOT NULL,  -- order inside track

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (track_id, lesson_order)
);

CREATE TABLE user_lesson_progress (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,

    PRIMARY KEY (user_id, lesson_id)
);


ALTER TABLE problems
    ADD COLUMN lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE;

ALTER TABLE problems
    DROP COLUMN track_id;

ALTER TABLE user_lesson_progress
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE lessons
ADD CONSTRAINT chk_lesson_order_positive CHECK (lesson_order > 0);



CREATE INDEX IF NOT EXISTS idx_lessons_track 
ON lessons(track_id);

CREATE INDEX IF NOT EXISTS idx_problems_lesson 
ON problems(lesson_id);

CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_user
ON user_lesson_progress(user_id);

