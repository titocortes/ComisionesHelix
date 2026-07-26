-- ─────────────────────────────────────────────────────────────────────────────
-- Squash migration — replaces 3 previous migrations.
-- Represents the complete schema as of 2026-06-30.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Tables with no FK dependencies ───────────────────────────────────────────

CREATE TABLE `user_roles` (
    `idUserRole` INTEGER NOT NULL AUTO_INCREMENT,
    `roleName`   VARCHAR(100) NOT NULL,
    `createdAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`  DATETIME(3) NOT NULL,
    PRIMARY KEY (`idUserRole`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `agency` (
    `idAgency`      INTEGER NOT NULL AUTO_INCREMENT,
    `helixAgencyId` INTEGER NULL,
    `agencyName`    VARCHAR(150) NOT NULL,
    `active`        BOOLEAN NOT NULL DEFAULT true,
    `createdAt`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`     DATETIME(3) NOT NULL,
    UNIQUE INDEX `agency_helixAgencyId_key`(`helixAgencyId`),
    PRIMARY KEY (`idAgency`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `region` (
    `idRegion`   INTEGER NOT NULL AUTO_INCREMENT,
    `regionName` VARCHAR(100) NOT NULL,
    `createdAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`  DATETIME(3) NOT NULL,
    PRIMARY KEY (`idRegion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `country` (
    `idCountry`   INTEGER NOT NULL AUTO_INCREMENT,
    `countryName` VARCHAR(100) NOT NULL,
    `countryCode` VARCHAR(10) NULL,
    PRIMARY KEY (`idCountry`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `cat_periodo` (
    `idCatPeriodo` INTEGER NOT NULL AUTO_INCREMENT,
    `periodName`   VARCHAR(100) NOT NULL,
    `periodMonths` INTEGER NOT NULL DEFAULT 12,
    PRIMARY KEY (`idCatPeriodo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `cancellation_reasons` (
    `idCancellationReason` INTEGER NOT NULL AUTO_INCREMENT,
    `reason`               VARCHAR(200) NOT NULL,
    `active`               BOOLEAN NOT NULL DEFAULT true,
    `createdAt`            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`            DATETIME(3) NOT NULL,
    PRIMARY KEY (`idCancellationReason`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `provider` (
    `idProvider`   INTEGER NOT NULL AUTO_INCREMENT,
    `providerName` VARCHAR(150) NOT NULL,
    `active`       BOOLEAN NOT NULL DEFAULT true,
    `createdAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`    DATETIME(3) NOT NULL,
    PRIMARY KEY (`idProvider`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `cron_execution_log` (
    `idCronLog`        INTEGER NOT NULL AUTO_INCREMENT,
    `cronType`         VARCHAR(50) NOT NULL,
    `startedAt`        DATETIME(3) NOT NULL,
    `finishedAt`       DATETIME(3) NULL,
    `status`           VARCHAR(20) NOT NULL,
    `recordsProcessed` INTEGER NULL,
    `errorMessage`     TEXT NULL,
    `attemptNumber`    INTEGER NOT NULL DEFAULT 1,
    `createdAt`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`idCronLog`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `payment_batches` (
    `idPaymentBatch` INTEGER NOT NULL AUTO_INCREMENT,
    `processedAt`    DATETIME(3) NOT NULL,
    `status`         VARCHAR(20) NOT NULL,
    `totalAmount`    DECIMAL(12, 2) NOT NULL,
    `createdAt`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`      DATETIME(3) NOT NULL,
    PRIMARY KEY (`idPaymentBatch`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── Tables with single-level FK dependencies ─────────────────────────────────

CREATE TABLE `affiliate` (
    `idAffiliate`      INTEGER NOT NULL AUTO_INCREMENT,
    `helixAffiliateId` INTEGER NULL,
    `affiliateName`    VARCHAR(150) NOT NULL,
    `affiliateCode`    VARCHAR(50) NULL,
    `reportEmail`      VARCHAR(191) NULL,
    `idAgency`         INTEGER NOT NULL,
    `active`           BOOLEAN NOT NULL DEFAULT true,
    `createdAt`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`        DATETIME(3) NOT NULL,
    UNIQUE INDEX `affiliate_helixAffiliateId_key`(`helixAffiliateId`),
    PRIMARY KEY (`idAffiliate`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Users` (
    `idUser`              INTEGER NOT NULL AUTO_INCREMENT,
    `firstName`           VARCHAR(100) NOT NULL,
    `lastName`            VARCHAR(100) NOT NULL,
    `userEmail`           VARCHAR(191) NOT NULL,
    `password`            VARCHAR(255) NOT NULL,
    `userCode`            VARCHAR(50) NULL,
    `helixUserId`         INTEGER NULL,
    `securityLevel`       INTEGER NOT NULL,
    `active`              BOOLEAN NOT NULL DEFAULT false,
    `hashKeyConfirmation` VARCHAR(255) NULL,
    `idUserRole`          INTEGER NOT NULL,
    `idAffiliate`         INTEGER NULL,
    `idUserRegion`        INTEGER NULL,
    `createdAt`           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`           DATETIME(3) NOT NULL,
    UNIQUE INDEX `Users_userEmail_key`(`userEmail`),
    UNIQUE INDEX `Users_helixUserId_key`(`helixUserId`),
    PRIMARY KEY (`idUser`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `refresh_tokens` (
    `idToken`   INTEGER NOT NULL AUTO_INCREMENT,
    `token`     VARCHAR(500) NOT NULL,
    `idUser`    INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revoked`   BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`idToken`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `client` (
    `idClient`             INTEGER NOT NULL AUTO_INCREMENT,
    `firstName`            VARCHAR(150) NOT NULL,
    `lastName`             VARCHAR(150) NOT NULL,
    `idType`               INTEGER NOT NULL,
    `idNumber`             VARCHAR(30) NOT NULL,
    `mobile`               VARCHAR(30) NULL,
    `email`                VARCHAR(191) NOT NULL,
    `nombreSaludo`         VARCHAR(100) NULL,
    `fechaNacimiento`      DATE NOT NULL,
    `gender`               VARCHAR(20) NOT NULL,
    `visaType`             VARCHAR(20) NULL,
    `activo`               BOOLEAN NOT NULL DEFAULT true,
    `assignedTo`           INTEGER NULL,
    `createdBy`            INTEGER NOT NULL,
    `usa_mobile`           VARCHAR(20) NULL,
    `idcountry_citizenship` INTEGER NOT NULL,
    `idcountry_residence`  INTEGER NULL,
    `batchId`              VARCHAR(100) NULL,
    `source`               VARCHAR(100) NULL,
    `AC_accountId`         INTEGER NULL,
    `deletedAt`            DATETIME(3) NULL,
    `createdAt`            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`            DATETIME(3) NOT NULL,
    UNIQUE INDEX `client_email_key`(`email`),
    PRIMARY KEY (`idClient`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `products` (
    `idProduct`            INTEGER NOT NULL AUTO_INCREMENT,
    `helixProductId`       INTEGER NULL,
    `productName`          VARCHAR(150) NOT NULL,
    `shortName`            VARCHAR(20) NOT NULL,
    `priceList`            DECIMAL(10, 2) NOT NULL,
    `priceWithoutDiscount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `costProduct`          DECIMAL(10, 2) NOT NULL,
    `gold_costProduct`     DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `gold_priceList`       DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `dependentPriceList`   DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `dependentCost`        DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `minCoverageDays`      INTEGER NULL,
    `idProvider`           INTEGER NOT NULL,
    `idCatPeriodo`         INTEGER NOT NULL,
    `includeDependents`    BOOLEAN NOT NULL DEFAULT false,
    `hasProductAssociated` BOOLEAN NOT NULL DEFAULT false,
    `commission`           DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `active`               BOOLEAN NOT NULL DEFAULT true,
    `planType`             VARCHAR(50) NULL,
    `createdAt`            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`            DATETIME(3) NOT NULL,
    UNIQUE INDEX `products_helixProductId_key`(`helixProductId`),
    PRIMARY KEY (`idProduct`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `commission_rates` (
    `idCommissionRate`       INTEGER NOT NULL AUTO_INCREMENT,
    `idProduct`              INTEGER NOT NULL,
    `productType`            INTEGER NULL,
    `monthlySellerAmount`    DECIMAL(10, 2) NOT NULL,
    `monthlyAffiliateAmount` DECIMAL(10, 2) NOT NULL,
    `monthlyAgencyAmount`    DECIMAL(10, 2) NOT NULL,
    `active`                 BOOLEAN NOT NULL DEFAULT true,
    `createdAt`              DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`              DATETIME(3) NOT NULL,
    PRIMARY KEY (`idCommissionRate`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `dependent_discounts` (
    `idDependentDiscount` INTEGER NOT NULL AUTO_INCREMENT,
    `idProduct`           INTEGER NOT NULL,
    `dependentNumber`     INTEGER NOT NULL,
    `discountPercentage`  DECIMAL(5, 2) NOT NULL,
    `orMore`              BOOLEAN NOT NULL DEFAULT false,
    `createdAt`           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`           DATETIME(3) NOT NULL,
    UNIQUE INDEX `dependent_discounts_idProduct_dependentNumber_key`(`idProduct`, `dependentNumber`),
    PRIMARY KEY (`idDependentDiscount`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `transaction` (
    `idTransaction`       INTEGER NOT NULL AUTO_INCREMENT,
    `idClient`            INTEGER NOT NULL,
    `transactionActive`   BOOLEAN NOT NULL DEFAULT false,
    `transactionStartDate` DATE NULL,
    `transactionEndDate`  DATE NULL,
    `firstPaymentDate`    DATE NULL,
    `paymentMethod`       INTEGER NOT NULL DEFAULT 1,
    `numDependents`       INTEGER NOT NULL DEFAULT 0,
    `totalPrice`          DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `totalCost`           DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `coverageDays`        INTEGER NULL,
    `coverageMonths`      INTEGER NULL,
    `financeChargeRate`   DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `monthlyPayment`      DECIMAL(10, 2) NULL DEFAULT 0,
    `dependentTotalPrice` DECIMAL(10, 2) NULL DEFAULT 0,
    `dependentTotalCost`  DECIMAL(10, 2) NULL DEFAULT 0,
    `transactionStatus`   INTEGER NOT NULL DEFAULT 1,
    `createdByUser`       INTEGER NOT NULL,
    `assignedToUser`      INTEGER NOT NULL,
    `AC_dealId`           VARCHAR(64) NULL,
    `MerchantId`          VARCHAR(64) NULL,
    `auth_solicitud`      DATETIME(3) NULL,
    `auth_client`         DATETIME(3) NULL,
    `invoice_sent`        DATETIME(3) NULL,
    `invoice_paid`        DATETIME(3) NULL,
    `createdAt`           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`           DATETIME(3) NOT NULL,
    PRIMARY KEY (`idTransaction`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `product_transaction` (
    `idProductTransaction` INTEGER NOT NULL AUTO_INCREMENT,
    `idTransaction`        INTEGER NOT NULL,
    `idProduct`            INTEGER NOT NULL,
    `quantity`             INTEGER NOT NULL DEFAULT 1,
    `unitPrice`            DECIMAL(10, 2) NULL,
    `unitCost`             DECIMAL(10, 2) NULL,
    `productType`          INTEGER NULL,
    `createdAt`            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`            DATETIME(3) NOT NULL,
    PRIMARY KEY (`idProductTransaction`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `payments` (
    `idPayment`                   INTEGER NOT NULL AUTO_INCREMENT,
    `helixPaymentId`              INTEGER NOT NULL,
    `helixProductTransactionId`   INTEGER NULL,
    `helixTransactionId`          INTEGER NULL,
    `helixClientId`               INTEGER NULL,
    `helixSellerId`               INTEGER NULL,
    `helixProductId`              INTEGER NULL,
    `paymentOrder`                INTEGER NOT NULL DEFAULT 1,
    `idTraceAR`                   VARCHAR(100) NULL,
    `reference`                   VARCHAR(255) NULL,
    `paymentDate`                 DATE NOT NULL,
    `paymentFrequency`            VARCHAR(20) NULL,
    `amount`                      DECIMAL(10, 2) NOT NULL,
    `paymentStatus`               INTEGER NOT NULL,
    `numDependents`               INTEGER NOT NULL DEFAULT 0,
    `payoutDate`                  DATETIME(3) NULL,
    `paidAmount`                  DECIMAL(10, 2) NULL,
    `paymentInstrument`           VARCHAR(30) NULL,
    `finalFolioPaymentInstrument` VARCHAR(30) NULL,
    `coverageStartDate`           DATE NULL,
    `coverageEndDate`             DATE NULL,
    `invoiceLink`                 VARCHAR(500) NULL,
    `createdAt`                   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`                   DATETIME(3) NOT NULL,
    UNIQUE INDEX `payments_helixPaymentId_key`(`helixPaymentId`),
    PRIMARY KEY (`idPayment`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `payment_tracking_events` (
    `idEvent`   INTEGER NOT NULL AUTO_INCREMENT,
    `idPayment` INTEGER NOT NULL,
    `eventType` VARCHAR(50) NOT NULL,
    `eventData` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`idEvent`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `address` (
    `idAddress` INTEGER NOT NULL AUTO_INCREMENT,
    `idClient`  INTEGER NOT NULL,
    `street`    VARCHAR(200) NULL,
    `city`      VARCHAR(100) NULL,
    `state`     VARCHAR(100) NULL,
    `zipCode`   VARCHAR(20) NULL,
    `country`   VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`idAddress`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `client_dependents` (
    `idDependent`     INTEGER NOT NULL AUTO_INCREMENT,
    `idTransaction`   INTEGER NOT NULL,
    `firstName`       VARCHAR(100) NOT NULL,
    `lastName`        VARCHAR(100) NOT NULL,
    `fechaNacimiento` DATE NOT NULL,
    `gender`          VARCHAR(20) NOT NULL,
    `relationship`    VARCHAR(50) NULL,
    `createdAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`       DATETIME(3) NOT NULL,
    PRIMARY KEY (`idDependent`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `beneficiaries` (
    `idBeneficiary`   INTEGER NOT NULL AUTO_INCREMENT,
    `name`            VARCHAR(200) NOT NULL,
    `email`           VARCHAR(191) NULL,
    `beneficiaryType` VARCHAR(20) NOT NULL,
    `helixEntityId`   INTEGER NOT NULL,
    `qboVendorId`     VARCHAR(100) NULL,
    `active`          BOOLEAN NOT NULL DEFAULT true,
    `idUser`          INTEGER NULL,
    `createdByUserId` INTEGER NOT NULL,
    `createdAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`       DATETIME(3) NOT NULL,
    UNIQUE INDEX `beneficiaries_idUser_key`(`idUser`),
    UNIQUE INDEX `beneficiaries_beneficiaryType_helixEntityId_key`(`beneficiaryType`, `helixEntityId`),
    PRIMARY KEY (`idBeneficiary`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── Tables with multi-level FK dependencies ───────────────────────────────────

CREATE TABLE `commission_records` (
    `idCommissionRecord`    INTEGER NOT NULL AUTO_INCREMENT,
    `idPayment`             INTEGER NOT NULL,
    `coverageStartDate`     DATE NOT NULL,
    `coverageEndDate`       DATE NOT NULL,
    `authorizationDate`     DATE NOT NULL,
    `status`                VARCHAR(30) NOT NULL DEFAULT 'ingested',
    `sellerAmount`          DECIMAL(10, 2) NOT NULL,
    `affiliateAmount`       DECIMAL(10, 2) NOT NULL,
    `agencyAmount`          DECIMAL(10, 2) NOT NULL,
    `idSellerBeneficiary`   INTEGER NULL,
    `idAffiliateBeneficiary` INTEGER NULL,
    `idAgencyBeneficiary`   INTEGER NULL,
    `idCancellationReason`  INTEGER NULL,
    `cancellationNotes`     TEXT NULL,
    `cancelledByUserId`     INTEGER NULL,
    `rejectionReason`       TEXT NULL,
    `helixClientId`         INTEGER NULL,
    `clientName`            VARCHAR(200) NULL,
    `clientEmail`           VARCHAR(191) NULL,
    `productName`           VARCHAR(150) NULL,
    `sellerName`            VARCHAR(200) NULL,
    `affiliateName`         VARCHAR(150) NULL,
    `agencyName`            VARCHAR(150) NULL,
    `createdAt`             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`             DATETIME(3) NOT NULL,
    PRIMARY KEY (`idCommissionRecord`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `commission_state_history` (
    `idStateHistory`     INTEGER NOT NULL AUTO_INCREMENT,
    `idCommissionRecord` INTEGER NOT NULL,
    `fromStatus`         VARCHAR(30) NOT NULL,
    `toStatus`           VARCHAR(30) NOT NULL,
    `changedByUserId`    INTEGER NULL,
    `notes`              TEXT NULL,
    `createdAt`          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`idStateHistory`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `payment_batch_items` (
    `idPaymentBatchItem` INTEGER NOT NULL AUTO_INCREMENT,
    `idPaymentBatch`     INTEGER NOT NULL,
    `idBeneficiary`      INTEGER NOT NULL,
    `totalAmount`        DECIMAL(12, 2) NOT NULL,
    `qboBillPaymentId`   VARCHAR(100) NULL,
    `status`             VARCHAR(20) NOT NULL,
    `rejectionReason`    TEXT NULL,
    `paidAt`             DATETIME(3) NULL,
    `createdAt`          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`          DATETIME(3) NOT NULL,
    PRIMARY KEY (`idPaymentBatchItem`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `payment_batch_records` (
    `idBatchRecord`      INTEGER NOT NULL AUTO_INCREMENT,
    `idPaymentBatchItem` INTEGER NOT NULL,
    `idCommissionRecord` INTEGER NOT NULL,
    `entityType`         VARCHAR(20) NOT NULL,
    `amount`             DECIMAL(10, 2) NOT NULL,
    UNIQUE INDEX `pbr_batchitem_commission_entity_uq`(`idPaymentBatchItem`, `idCommissionRecord`, `entityType`),
    PRIMARY KEY (`idBatchRecord`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── Foreign Keys ──────────────────────────────────────────────────────────────

ALTER TABLE `affiliate` ADD CONSTRAINT `affiliate_idAgency_fkey`
    FOREIGN KEY (`idAgency`) REFERENCES `agency`(`idAgency`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Users` ADD CONSTRAINT `Users_idUserRole_fkey`
    FOREIGN KEY (`idUserRole`) REFERENCES `user_roles`(`idUserRole`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Users` ADD CONSTRAINT `Users_idAffiliate_fkey`
    FOREIGN KEY (`idAffiliate`) REFERENCES `affiliate`(`idAffiliate`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Users` ADD CONSTRAINT `Users_idUserRegion_fkey`
    FOREIGN KEY (`idUserRegion`) REFERENCES `region`(`idRegion`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_idUser_fkey`
    FOREIGN KEY (`idUser`) REFERENCES `Users`(`idUser`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `client` ADD CONSTRAINT `client_idcountry_citizenship_fkey`
    FOREIGN KEY (`idcountry_citizenship`) REFERENCES `country`(`idCountry`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `client` ADD CONSTRAINT `client_idcountry_residence_fkey`
    FOREIGN KEY (`idcountry_residence`) REFERENCES `country`(`idCountry`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `address` ADD CONSTRAINT `address_idClient_fkey`
    FOREIGN KEY (`idClient`) REFERENCES `client`(`idClient`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `client_dependents` ADD CONSTRAINT `client_dependents_idTransaction_fkey`
    FOREIGN KEY (`idTransaction`) REFERENCES `transaction`(`idTransaction`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `products` ADD CONSTRAINT `products_idProvider_fkey`
    FOREIGN KEY (`idProvider`) REFERENCES `provider`(`idProvider`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `products` ADD CONSTRAINT `products_idCatPeriodo_fkey`
    FOREIGN KEY (`idCatPeriodo`) REFERENCES `cat_periodo`(`idCatPeriodo`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `commission_rates` ADD CONSTRAINT `commission_rates_idProduct_fkey`
    FOREIGN KEY (`idProduct`) REFERENCES `products`(`idProduct`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `dependent_discounts` ADD CONSTRAINT `dependent_discounts_idProduct_fkey`
    FOREIGN KEY (`idProduct`) REFERENCES `products`(`idProduct`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `transaction` ADD CONSTRAINT `transaction_idClient_fkey`
    FOREIGN KEY (`idClient`) REFERENCES `client`(`idClient`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `product_transaction` ADD CONSTRAINT `product_transaction_idTransaction_fkey`
    FOREIGN KEY (`idTransaction`) REFERENCES `transaction`(`idTransaction`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `product_transaction` ADD CONSTRAINT `product_transaction_idProduct_fkey`
    FOREIGN KEY (`idProduct`) REFERENCES `products`(`idProduct`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `payment_tracking_events` ADD CONSTRAINT `payment_tracking_events_idPayment_fkey`
    FOREIGN KEY (`idPayment`) REFERENCES `payments`(`idPayment`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `beneficiaries` ADD CONSTRAINT `beneficiaries_idUser_fkey`
    FOREIGN KEY (`idUser`) REFERENCES `Users`(`idUser`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `commission_records` ADD CONSTRAINT `commission_records_idPayment_fkey`
    FOREIGN KEY (`idPayment`) REFERENCES `payments`(`idPayment`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `commission_records` ADD CONSTRAINT `commission_records_idSellerBeneficiary_fkey`
    FOREIGN KEY (`idSellerBeneficiary`) REFERENCES `beneficiaries`(`idBeneficiary`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `commission_records` ADD CONSTRAINT `commission_records_idAffiliateBeneficiary_fkey`
    FOREIGN KEY (`idAffiliateBeneficiary`) REFERENCES `beneficiaries`(`idBeneficiary`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `commission_records` ADD CONSTRAINT `commission_records_idAgencyBeneficiary_fkey`
    FOREIGN KEY (`idAgencyBeneficiary`) REFERENCES `beneficiaries`(`idBeneficiary`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `commission_records` ADD CONSTRAINT `commission_records_idCancellationReason_fkey`
    FOREIGN KEY (`idCancellationReason`) REFERENCES `cancellation_reasons`(`idCancellationReason`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `commission_state_history` ADD CONSTRAINT `commission_state_history_idCommissionRecord_fkey`
    FOREIGN KEY (`idCommissionRecord`) REFERENCES `commission_records`(`idCommissionRecord`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `commission_state_history` ADD CONSTRAINT `commission_state_history_changedByUserId_fkey`
    FOREIGN KEY (`changedByUserId`) REFERENCES `Users`(`idUser`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `payment_batch_items` ADD CONSTRAINT `payment_batch_items_idPaymentBatch_fkey`
    FOREIGN KEY (`idPaymentBatch`) REFERENCES `payment_batches`(`idPaymentBatch`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `payment_batch_items` ADD CONSTRAINT `payment_batch_items_idBeneficiary_fkey`
    FOREIGN KEY (`idBeneficiary`) REFERENCES `beneficiaries`(`idBeneficiary`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `payment_batch_records` ADD CONSTRAINT `payment_batch_records_idPaymentBatchItem_fkey`
    FOREIGN KEY (`idPaymentBatchItem`) REFERENCES `payment_batch_items`(`idPaymentBatchItem`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `payment_batch_records` ADD CONSTRAINT `payment_batch_records_idCommissionRecord_fkey`
    FOREIGN KEY (`idCommissionRecord`) REFERENCES `commission_records`(`idCommissionRecord`) ON DELETE RESTRICT ON UPDATE CASCADE;
