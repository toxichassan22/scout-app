-- Backfill video attempts previously stored inside Score.values.attempts JSON into the dedicated VideoAttempt table.
-- This runs once and ignores any rows that already exist for the same competition/team/attemptNumber.
INSERT OR IGNORE INTO "VideoAttempt" ("id", "competitionId", "teamId", "attemptNumber", "prompt", "videoUrl", "videoStatus", "createdAt", "updatedAt")
SELECT
  lower(hex(randomblob(16))),
  s."competitionId",
  s."teamId",
  CAST(e."key" AS INTEGER) + 1,
  json_extract(e."value", '$.prompt'),
  json_extract(e."value", '$.videoUrl'),
  COALESCE(json_extract(e."value", '$.videoStatus'), 'pending'),
  COALESCE(datetime(json_extract(e."value", '$.at')), s."submittedAt", CURRENT_TIMESTAMP),
  COALESCE(datetime(json_extract(e."value", '$.at')), s."submittedAt", CURRENT_TIMESTAMP)
FROM "Score" s
JOIN json_each(s."values", '$.attempts') e
WHERE json_extract(s."values", '$.mode') = 'video'
  AND json_type(s."values", '$.attempts') = 'array';
