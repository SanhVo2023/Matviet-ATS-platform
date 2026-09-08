-- Reconcile train (agentic audit P1): open-proposal dedupe becomes a DB guarantee.
-- 1) One-time cleanup: if the old check-then-insert race ever produced two OPEN
--    twins for one dedupe_key, keep the newest and supersede the rest, so the
--    partial unique index below can be created on live data.
UPDATE `agent_proposals`
SET `status` = 'superseded'
WHERE `status` IN ('proposed', 'approved')
  AND `rowid` NOT IN (
    SELECT MAX(`rowid`) FROM `agent_proposals`
    WHERE `status` IN ('proposed', 'approved')
    GROUP BY `dedupe_key`
  );
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_proposals_open_dedupe` ON `agent_proposals` (`dedupe_key`) WHERE "status" in ('proposed', 'approved');
