ALTER TABLE `accounts`
    ADD COLUMN `statusSince` DATETIME(3) NULL;

UPDATE `accounts`
SET `statusSince` = `openedAt`;

ALTER TABLE `accounts`
    MODIFY `statusSince` DATETIME(3) NOT NULL;

CREATE TABLE `account_status_events` (
    `eventId` VARCHAR(30) NOT NULL,
    `accountId` VARCHAR(64) NOT NULL,
    `previousStatus` ENUM('ACTIVE', 'DORMANT', 'CLOSED') NOT NULL,
    `newStatus` ENUM('ACTIVE', 'DORMANT', 'CLOSED') NOT NULL,
    `reason` VARCHAR(80) NOT NULL,
    `previousStatusSince` DATETIME(3) NOT NULL,
    `effectiveAt` DATETIME(3) NOT NULL,

    INDEX `account_status_events_accountId_effectiveAt_idx`(`accountId`, `effectiveAt`),
    PRIMARY KEY (`eventId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `account_status_events`
    ADD CONSTRAINT `account_status_events_accountId_fkey`
    FOREIGN KEY (`accountId`) REFERENCES `accounts`(`accountId`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
