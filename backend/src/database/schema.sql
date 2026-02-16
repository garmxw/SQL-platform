
-- SQL Platform Database Schema + Seed Data
-- Author: garmx



-- TABLES


-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    user_role VARCHAR(20) DEFAULT 'student',
    -- Account Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP, 
    -- Verification Columns
    is_verified BOOLEAN DEFAULT FALSE,
    verification_hash TEXT,
    verification_expires_at TIMESTAMP
);

-- Tracks table
CREATE TABLE IF NOT EXISTS tracks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    difficulty VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Problems table
CREATE TABLE IF NOT EXISTS problems (
    id SERIAL PRIMARY KEY,
    track_id INTEGER REFERENCES tracks(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    starter_sql TEXT,
    solution_sql TEXT NOT NULL,
    difficulty VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    problem_id INTEGER REFERENCES problems(id) ON DELETE CASCADE,
    submitted_sql TEXT NOT NULL,
    is_correct BOOLEAN,
    execution_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User progress table
CREATE TABLE IF NOT EXISTS user_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    track_id INTEGER REFERENCES tracks(id) ON DELETE CASCADE,
    completed_problems INTEGER DEFAULT 0,
    total_problems INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, track_id)
);

-- Badges table
CREATE TABLE IF NOT EXISTS badges (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    badge_link TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User badges table
CREATE TABLE IF NOT EXISTS user_badges (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    badge_id INTEGER REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, badge_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_problem ON submissions(problem_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_track ON user_progress(user_id, track_id);



-- SEED DATA

-- Users
-- INSERT INTO users (username, email, password_hash, user_role)
-- VALUES
-- ('admin', 'admin@sqlplatform.com', 'hashed_password_here', 'admin'),
-- ('alice', 'alice@example.com', 'hashed_password_here', 'student');

-- -- Tracks
-- INSERT INTO tracks (title, description, difficulty)
-- VALUES
-- ('Basics', 'Learn fundamental SQL queries', 'Easy'),
-- ('Joins', 'Master SQL JOINs', 'Medium');

-- -- Problems
-- INSERT INTO problems (track_id, title, description, starter_sql, solution_sql, difficulty)
-- VALUES
-- (1, 'Select all employees', 'Return all employees from the table', NULL, 'SELECT * FROM employees;', 'Easy'),
-- (1, 'Select names only', 'Return only the names of employees', NULL, 'SELECT name FROM employees;', 'Easy'),
-- (2, 'Inner Join Example', 'Join employees with departments', NULL, 'SELECT e.name, d.name FROM employees e INNER JOIN departments d ON e.department_id = d.id;', 'Medium');

-- Badges
-- INSERT INTO badges (name, description, badge_link)
-- VALUES
-- ('First Query', 'Completed first SQL problem', 'https://example.com/icons/first_query.png'),
-- ('Track Beginner', 'Completed all problems in a track', 'https://example.com/icons/track_beginner.png');
