-- CreateTable
CREATE TABLE `customers` (
    `customerId` VARCHAR(20) NOT NULL,
    `firstName` VARCHAR(80) NOT NULL,
    `lastName` VARCHAR(80) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `kycStatus` ENUM('VERIFIED', 'PENDING') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `customers_email_key`(`email`),
    PRIMARY KEY (`customerId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `accounts` (
    `accountId` VARCHAR(64) NOT NULL,
    `customerId` VARCHAR(20) NOT NULL,
    `accountType` ENUM('CURRENT', 'SAVINGS') NOT NULL,
    `status` ENUM('ACTIVE', 'DORMANT', 'CLOSED') NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'INR',
    `initialBalance` DECIMAL(18, 2) NOT NULL,
    `overdraftLimit` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `openedAt` DATETIME(3) NOT NULL,

    INDEX `accounts_customerId_idx`(`customerId`),
    INDEX `accounts_status_idx`(`status`),
    PRIMARY KEY (`accountId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `merchants` (
    `merchantId` VARCHAR(20) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `country` VARCHAR(2) NOT NULL,
    `status` VARCHAR(30) NOT NULL,

    INDEX `merchants_category_idx`(`category`),
    PRIMARY KEY (`merchantId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `devices` (
    `deviceId` VARCHAR(20) NOT NULL,
    `deviceType` VARCHAR(50) NOT NULL,
    `operatingSystem` VARCHAR(80) NOT NULL,
    `trusted` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`deviceId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `transactionId` VARCHAR(30) NOT NULL,
    `accountId` VARCHAR(64) NOT NULL,
    `merchantId` VARCHAR(20) NOT NULL,
    `deviceId` VARCHAR(20) NOT NULL,
    `type` ENUM('CREDIT', 'DEBIT', 'TRANSFER_OUT', 'TRANSFER_IN') NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `currency` VARCHAR(3) NOT NULL,
    `balanceBefore` DECIMAL(18, 2) NOT NULL,
    `balanceAfter` DECIMAL(18, 2) NOT NULL,
    `status` VARCHAR(30) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL,

    INDEX `transactions_accountId_timestamp_idx`(`accountId`, `timestamp`),
    INDEX `transactions_merchantId_idx`(`merchantId`),
    INDEX `transactions_deviceId_idx`(`deviceId`),
    INDEX `transactions_type_idx`(`type`),
    INDEX `transactions_timestamp_idx`(`timestamp`),
    PRIMARY KEY (`transactionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transfers` (
    `transferId` VARCHAR(30) NOT NULL,
    `sourceAccountId` VARCHAR(64) NOT NULL,
    `destinationAccountId` VARCHAR(64) NOT NULL,
    `sourceTransactionId` VARCHAR(30) NOT NULL,
    `destinationTransactionId` VARCHAR(30) NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `status` VARCHAR(30) NOT NULL,

    UNIQUE INDEX `transfers_sourceTransactionId_key`(`sourceTransactionId`),
    UNIQUE INDEX `transfers_destinationTransactionId_key`(`destinationTransactionId`),
    INDEX `transfers_sourceAccountId_idx`(`sourceAccountId`),
    INDEX `transfers_destinationAccountId_idx`(`destinationAccountId`),
    PRIMARY KEY (`transferId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `risk_rules` (
    `ruleId` VARCHAR(10) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` TEXT NOT NULL,
    `points` INTEGER NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`ruleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `alerts` (
    `alertId` VARCHAR(30) NOT NULL,
    `transactionId` VARCHAR(30) NOT NULL,
    `accountId` VARCHAR(64) NOT NULL,
    `riskScore` INTEGER NOT NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    `status` ENUM('OPEN', 'ESCALATED', 'DISMISSED', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
    `triggeredRules` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL,

    INDEX `alerts_accountId_idx`(`accountId`),
    INDEX `alerts_severity_status_idx`(`severity`, `status`),
    INDEX `alerts_riskScore_idx`(`riskScore`),
    INDEX `alerts_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`alertId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cases` (
    `caseId` VARCHAR(30) NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('OPEN', 'IN_REVIEW', 'ESCALATED', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    `assignedTo` VARCHAR(30) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `resolvedAt` DATETIME(3) NULL,

    INDEX `cases_status_idx`(`status`),
    INDEX `cases_priority_idx`(`priority`),
    INDEX `cases_assignedTo_idx`(`assignedTo`),
    PRIMARY KEY (`caseId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `case_alerts` (
    `caseId` VARCHAR(30) NOT NULL,
    `alertId` VARCHAR(30) NOT NULL,

    INDEX `case_alerts_alertId_idx`(`alertId`),
    PRIMARY KEY (`caseId`, `alertId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `analyst_actions` (
    `actionId` VARCHAR(30) NOT NULL,
    `alertId` VARCHAR(30) NULL,
    `caseId` VARCHAR(30) NULL,
    `analystId` VARCHAR(30) NOT NULL,
    `actionType` ENUM('ESCALATE_ALERT', 'DISMISS_ALERT', 'RESOLVE_CASE', 'REOPEN_CASE', 'ADD_NOTE') NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `caseAlertCaseId` VARCHAR(30) NULL,
    `caseAlertAlertId` VARCHAR(30) NULL,

    INDEX `analyst_actions_alertId_idx`(`alertId`),
    INDEX `analyst_actions_caseId_idx`(`caseId`),
    INDEX `analyst_actions_analystId_createdAt_idx`(`analystId`, `createdAt`),
    PRIMARY KEY (`actionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_events` (
    `eventId` VARCHAR(30) NOT NULL,
    `entityType` VARCHAR(40) NOT NULL,
    `entityId` VARCHAR(64) NOT NULL,
    `eventType` VARCHAR(60) NOT NULL,
    `actorId` VARCHAR(30) NOT NULL,
    `details` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_events_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `audit_events_actorId_createdAt_idx`(`actorId`, `createdAt`),
    INDEX `audit_events_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`eventId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`customerId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`accountId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_merchantId_fkey` FOREIGN KEY (`merchantId`) REFERENCES `merchants`(`merchantId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `devices`(`deviceId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_sourceAccountId_fkey` FOREIGN KEY (`sourceAccountId`) REFERENCES `accounts`(`accountId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_destinationAccountId_fkey` FOREIGN KEY (`destinationAccountId`) REFERENCES `accounts`(`accountId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_sourceTransactionId_fkey` FOREIGN KEY (`sourceTransactionId`) REFERENCES `transactions`(`transactionId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_destinationTransactionId_fkey` FOREIGN KEY (`destinationTransactionId`) REFERENCES `transactions`(`transactionId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alerts` ADD CONSTRAINT `alerts_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`transactionId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alerts` ADD CONSTRAINT `alerts_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`accountId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `case_alerts` ADD CONSTRAINT `case_alerts_caseId_fkey` FOREIGN KEY (`caseId`) REFERENCES `cases`(`caseId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `case_alerts` ADD CONSTRAINT `case_alerts_alertId_fkey` FOREIGN KEY (`alertId`) REFERENCES `alerts`(`alertId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analyst_actions` ADD CONSTRAINT `analyst_actions_caseId_fkey` FOREIGN KEY (`caseId`) REFERENCES `cases`(`caseId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analyst_actions` ADD CONSTRAINT `analyst_actions_alertId_fkey` FOREIGN KEY (`alertId`) REFERENCES `alerts`(`alertId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analyst_actions` ADD CONSTRAINT `analyst_actions_caseAlertCaseId_caseAlertAlertId_fkey` FOREIGN KEY (`caseAlertCaseId`, `caseAlertAlertId`) REFERENCES `case_alerts`(`caseId`, `alertId`) ON DELETE SET NULL ON UPDATE CASCADE;
