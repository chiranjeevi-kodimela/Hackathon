CREATE TABLE `alert_rules` (
    `alertId` VARCHAR(30) NOT NULL,
    `ruleId` VARCHAR(10) NOT NULL,
    `points` INTEGER NOT NULL,
    `reason` TEXT NOT NULL,

    INDEX `alert_rules_ruleId_idx`(`ruleId`),
    PRIMARY KEY (`alertId`, `ruleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `alert_rules`
    ADD CONSTRAINT `alert_rules_alertId_fkey`
    FOREIGN KEY (`alertId`) REFERENCES `alerts`(`alertId`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `alert_rules`
    ADD CONSTRAINT `alert_rules_ruleId_fkey`
    FOREIGN KEY (`ruleId`) REFERENCES `risk_rules`(`ruleId`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
