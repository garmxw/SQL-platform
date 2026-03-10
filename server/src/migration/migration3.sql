ALTER TABLE badges
ADD COLUMN code TEXT UNIQUE NOT NULL;


ALTER TABLE badges
ADD COLUMN xp_reward INT DEFAULT 0;

ALTER TABLE badges
ADD COLUMN rarity TEXT
CHECK (rarity IN ('common','rare','epic','legendary'))
DEFAULT 'common';

ALTER TABLE badges
RENAME COLUMN badge_link TO icon_url;

ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1;

INSERT INTO badges (code, name, description, icon_url, xp_reward, rarity)
VALUES

-- Beginner
('FIRST_QUERY', 'First Query', 'Execute your very first SQL query.', NULL, 10, 'common'),
('FIRST_CORRECT', 'First Success', 'Solve your first exercise correctly.', NULL, 20, 'common'),
('FIVE_SOLVES', 'Getting Started', 'Solve 5 exercises.', NULL, 30, 'common'),
('TEN_SOLVES', 'SQL Apprentice', 'Solve 10 exercises.', NULL, 50, 'common'),

-- Progression
('TWENTY_FIVE_SOLVES', 'Rising Talent', 'Solve 25 exercises.', NULL, 80, 'rare'),
('FIFTY_SOLVES', 'Query Machine', 'Solve 50 exercises.', NULL, 120, 'rare'),
('HUNDRED_SOLVES', 'SQL Expert', 'Solve 100 exercises.', NULL, 250, 'epic'),

-- Skill-Based
('FIRST_JOIN', 'Join Explorer', 'Successfully use JOIN for the first time.', NULL, 40, 'rare'),
('FIRST_SUBQUERY', 'Subquery Initiate', 'Successfully use a subquery.', NULL, 40, 'rare'),
('AGGREGATION_MASTER', 'Aggregation Master', 'Use GROUP BY and HAVING correctly.', NULL, 60, 'rare'),
('WINDOW_MASTER', 'Window Wizard', 'Successfully use a window function.', NULL, 120, 'epic'),

-- Performance
('ZERO_RETRY', 'Flawless Victory', 'Solve an exercise on the first try.', NULL, 30, 'rare'),
('SPEED_RUNNER', 'Speed Runner', 'Solve an exercise in under 1 minute.', NULL, 50, 'rare'),
('TEN_STREAK', 'On Fire', 'Solve 10 exercises in a row without failing.', NULL, 100, 'epic'),

-- Consistency
('THREE_DAY_STREAK', 'Consistent Learner', 'Practice 3 days in a row.', NULL, 50, 'rare'),
('SEVEN_DAY_STREAK', 'Weekly Warrior', 'Practice 7 days in a row.', NULL, 120, 'epic'),
('THIRTY_DAY_STREAK', 'SQL Discipline', 'Practice 30 days in a row.', NULL, 400, 'legendary'),

-- Advanced
('HARD_SOLVER', 'Challenge Accepted', 'Solve your first hard-level exercise.', NULL, 100, 'rare'),
('ALL_EASY_DONE', 'Easy Conqueror', 'Complete all easy exercises.', NULL, 150, 'epic'),
('ALL_TRACK_COMPLETE', 'Track Master', 'Complete an entire learning track.', NULL, 500, 'legendary');