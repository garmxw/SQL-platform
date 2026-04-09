import { db } from "#shared/config/db.js";

async function issueCertificate(userId, examId, scorePercent) {
  // Check all lessons completed across ALL tracks
  const allDone = await db.query(
    `
    SELECT COUNT(*) = (SELECT COUNT(*) FROM lessons) AS all_complete
    FROM user_lesson_progress
    WHERE user_id = $1 AND completed = true
  `,
    [userId],
  );

  if (!allDone.rows[0].all_complete) return null;

  // Check score meets cert_threshold for this exam
  const examRow = await db.query(
    "SELECT cert_threshold FROM track_exams WHERE id=$1",
    [examId],
  );
  if (scorePercent < examRow.rows[0].cert_threshold) return null;

  // Issue (UPSERT safe — UNIQUE constraint on user_id + exam_id)
  const cert = await db.query(
    `
    INSERT INTO certificates (user_id, exam_id, score_percent)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, exam_id) DO NOTHING
    RETURNING *
  `,
    [userId, examId, scorePercent],
  );

  return cert.rows[0];
}
