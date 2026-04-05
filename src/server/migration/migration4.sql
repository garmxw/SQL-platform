-- new state table right here
CREATE TABLE user_problem_state (
  user_id INT NOT NULL,
  problem_id INT NOT NULL,

  attempts INT DEFAULT 0,
  is_solved BOOLEAN DEFAULT false,

  first_attempt_at TIMESTAMP,
  solved_at TIMESTAMP,

  PRIMARY KEY (user_id, problem_id),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
);

ALTER TABLE users
ADD COLUMN current_streak INT DEFAULT 0,
ADD COLUMN longest_streak INT DEFAULT 0,
ADD COLUMN last_solved_date DATE;

ALTER TABLE users ADD COLUMN avatar_url TEXT,
  ADD COLUMN display_name VARCHAR(25) CHECK (char_length(display_name) >= 3),
  ADD COLUMN bio VARCHAR(200),
  ADD COLUMN location VARCHAR(100),
  ADD COLUMN github_name VARCHAR(39),   
  ADD COLUMN twitter_name VARCHAR(15),  
  ADD COLUMN portfolio_url TEXT;     