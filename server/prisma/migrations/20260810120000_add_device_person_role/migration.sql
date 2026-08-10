-- Each device records who is using it: their own name and their scouting role.
-- Existing rows default to empty, which the app treats as "not yet identified".
ALTER TABLE "TeamDevice" ADD COLUMN "role" TEXT NOT NULL DEFAULT '';
