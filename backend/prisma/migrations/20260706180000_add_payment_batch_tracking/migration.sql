-- Identifies which ingestion batch (cron run or manual trigger) a Payment came
-- from, so a bad batch can be located and undone. SET NULL on delete: removing
-- a CronExecutionLog row (unrelated cleanup) must never cascade-delete payments.
ALTER TABLE `payments`
    ADD COLUMN `idCronLog` INTEGER NULL,
    ADD CONSTRAINT `payments_idCronLog_fkey`
        FOREIGN KEY (`idCronLog`) REFERENCES `cron_execution_log`(`idCronLog`) ON DELETE SET NULL ON UPDATE CASCADE;
