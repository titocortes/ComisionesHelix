-- CreateTable
CREATE TABLE `user_roles` (
    `idUserRole` INTEGER NOT NULL AUTO_INCREMENT,
    `roleName` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`idUserRole`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Users` (
    `idUser` INTEGER NOT NULL AUTO_INCREMENT,
    `firstName` VARCHAR(100) NOT NULL,
    `lastName` VARCHAR(100) NOT NULL,
    `userEmail` VARCHAR(191) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `userCode` VARCHAR(50) NULL,
    `securityLevel` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT false,
    `hashKeyConfirmation` VARCHAR(255) NULL,
    `idUserRole` INTEGER NOT NULL,
    `idAffiliate` INTEGER NULL,
    `idUserRegion` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Users_userEmail_key`(`userEmail`),
    PRIMARY KEY (`idUser`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `idToken` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(500) NOT NULL,
    `idUser` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revoked` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`idToken`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agency` (
    `idAgency` INTEGER NOT NULL AUTO_INCREMENT,
    `agencyName` VARCHAR(150) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`idAgency`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `affiliate` (
    `idAffiliate` INTEGER NOT NULL AUTO_INCREMENT,
    `affiliateName` VARCHAR(150) NOT NULL,
    `affiliateCode` VARCHAR(50) NULL,
    `idAgency` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`idAffiliate`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `region` (
    `idRegion` INTEGER NOT NULL AUTO_INCREMENT,
    `regionName` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`idRegion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `country` (
    `idCountry` INTEGER NOT NULL AUTO_INCREMENT,
    `countryName` VARCHAR(100) NOT NULL,
    `countryCode` VARCHAR(10) NULL,

    PRIMARY KEY (`idCountry`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cat_periodo` (
    `idCatPeriodo` INTEGER NOT NULL AUTO_INCREMENT,
    `periodName` VARCHAR(100) NOT NULL,
    `periodMonths` INTEGER NOT NULL DEFAULT 12,

    PRIMARY KEY (`idCatPeriodo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client` (
    `idClient` INTEGER NOT NULL AUTO_INCREMENT,
    `firstName` VARCHAR(150) NOT NULL,
    `lastName` VARCHAR(150) NOT NULL,
    `idType` INTEGER NOT NULL,
    `idNumber` VARCHAR(30) NOT NULL,
    `mobile` VARCHAR(30) NULL,
    `email` VARCHAR(191) NOT NULL,
    `nombreSaludo` VARCHAR(100) NULL,
    `fechaNacimiento` DATE NOT NULL,
    `gender` VARCHAR(20) NOT NULL,
    `visaType` VARCHAR(20) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `assignedTo` INTEGER NULL,
    `createdBy` INTEGER NOT NULL,
    `usa_mobile` VARCHAR(20) NULL,
    `idcountry_citizenship` INTEGER NOT NULL,
    `idcountry_residence` INTEGER NULL,
    `batchId` VARCHAR(100) NULL,
    `source` VARCHAR(100) NULL,
    `AC_accountId` INTEGER NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `client_email_key`(`email`),
    PRIMARY KEY (`idClient`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `address` (
    `idAddress` INTEGER NOT NULL AUTO_INCREMENT,
    `idClient` INTEGER NOT NULL,
    `street` VARCHAR(200) NULL,
    `city` VARCHAR(100) NULL,
    `state` VARCHAR(100) NULL,
    `zipCode` VARCHAR(20) NULL,
    `country` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`idAddress`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_dependents` (
    `idDependent` INTEGER NOT NULL AUTO_INCREMENT,
    `idTransaction` INTEGER NOT NULL,
    `firstName` VARCHAR(100) NOT NULL,
    `lastName` VARCHAR(100) NOT NULL,
    `fechaNacimiento` DATE NOT NULL,
    `gender` VARCHAR(20) NOT NULL,
    `relationship` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`idDependent`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `provider` (
    `idProvider` INTEGER NOT NULL AUTO_INCREMENT,
    `providerName` VARCHAR(150) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`idProvider`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `idProduct` INTEGER NOT NULL AUTO_INCREMENT,
    `productName` VARCHAR(150) NOT NULL,
    `shortName` VARCHAR(20) NOT NULL,
    `priceList` DECIMAL(10, 2) NOT NULL,
    `priceWithoutDiscount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `costProduct` DECIMAL(10, 2) NOT NULL,
    `gold_costProduct` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `gold_priceList` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `dependentPriceList` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `dependentCost` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `minCoverageDays` INTEGER NULL,
    `idProvider` INTEGER NOT NULL,
    `idCatPeriodo` INTEGER NOT NULL,
    `includeDependents` BOOLEAN NOT NULL DEFAULT false,
    `hasProductAssociated` BOOLEAN NOT NULL DEFAULT false,
    `commission` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `planType` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`idProduct`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commission` (
    `idComission` INTEGER NOT NULL AUTO_INCREMENT,
    `idProduct` INTEGER NOT NULL,
    `productType` INTEGER NOT NULL,
    `memberAffiliate` DECIMAL(6, 2) NOT NULL,
    `memberAgency` DECIMAL(6, 2) NOT NULL,
    `memberCmo` DECIMAL(6, 2) NOT NULL,
    `dep1Affiliate` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `dep2Affiliate` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `dep3Affiliate` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `dep4Affiliate` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `dep1Agency` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `dep2Agency` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `dep3Agency` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `dep4Agency` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `dep1Cmo` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `dep2Cmo` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `dep3Cmo` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `dep4Cmo` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`idComission`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transaction` (
    `idTransaction` INTEGER NOT NULL AUTO_INCREMENT,
    `idClient` INTEGER NOT NULL,
    `transactionActive` BOOLEAN NOT NULL DEFAULT false,
    `transactionStartDate` DATE NULL,
    `transactionEndDate` DATE NULL,
    `firstPaymentDate` DATE NULL,
    `paymentMethod` INTEGER NOT NULL DEFAULT 1,
    `numDependents` INTEGER NOT NULL DEFAULT 0,
    `totalPrice` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `totalCost` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `coverageDays` INTEGER NULL,
    `coverageMonths` INTEGER NULL,
    `financeChargeRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `monthlyPayment` DECIMAL(10, 2) NULL DEFAULT 0,
    `dependentTotalPrice` DECIMAL(10, 2) NULL DEFAULT 0,
    `dependentTotalCost` DECIMAL(10, 2) NULL DEFAULT 0,
    `transactionStatus` INTEGER NOT NULL DEFAULT 1,
    `createdByUser` INTEGER NOT NULL,
    `assignedToUser` INTEGER NOT NULL,
    `AC_dealId` VARCHAR(64) NULL,
    `MerchantId` VARCHAR(64) NULL,
    `auth_solicitud` DATETIME(3) NULL,
    `auth_client` DATETIME(3) NULL,
    `invoice_sent` DATETIME(3) NULL,
    `invoice_paid` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`idTransaction`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_transaction` (
    `idProductTransaction` INTEGER NOT NULL AUTO_INCREMENT,
    `idTransaction` INTEGER NOT NULL,
    `idProduct` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unitPrice` DECIMAL(10, 2) NULL,
    `unitCost` DECIMAL(10, 2) NULL,
    `productType` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`idProductTransaction`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `idPayment` INTEGER NOT NULL AUTO_INCREMENT,
    `idProductTransaction` INTEGER NOT NULL,
    `paymentOrder` INTEGER NOT NULL,
    `idTraceAR` VARCHAR(100) NULL,
    `reference` VARCHAR(255) NULL,
    `paymentDate` DATE NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `paymentStatus` INTEGER NOT NULL,
    `payoutDate` DATETIME(3) NULL,
    `paidAmount` DECIMAL(10, 2) NULL,
    `paymentInstrument` VARCHAR(30) NULL,
    `finalFolioPaymentInstrument` VARCHAR(30) NULL,
    `idCombinePayment` INTEGER NULL,
    `coverageStartDate` DATE NULL,
    `coverageEndDate` DATE NULL,
    `invoiceLink` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`idPayment`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_tracking_events` (
    `idEvent` INTEGER NOT NULL AUTO_INCREMENT,
    `idPayment` INTEGER NOT NULL,
    `eventType` VARCHAR(50) NOT NULL,
    `eventData` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`idEvent`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coverage_period` (
    `idCoveragePeriod` INTEGER NOT NULL AUTO_INCREMENT,
    `idPayment` INTEGER NOT NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `coverage_period_idPayment_key`(`idPayment`),
    PRIMARY KEY (`idCoveragePeriod`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commission_records` (
    `idCommissionRecord` INTEGER NOT NULL AUTO_INCREMENT,
    `idProductTransaction` INTEGER NOT NULL,
    `idPayment` INTEGER NULL,
    `idAffiliate` INTEGER NULL,
    `commissionType` VARCHAR(20) NOT NULL,
    `recipientType` VARCHAR(20) NOT NULL,
    `commissionAmount` DECIMAL(10, 2) NOT NULL,
    `commissionRate` DECIMAL(6, 2) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `paidAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`idCommissionRecord`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Users` ADD CONSTRAINT `Users_idUserRole_fkey` FOREIGN KEY (`idUserRole`) REFERENCES `user_roles`(`idUserRole`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Users` ADD CONSTRAINT `Users_idAffiliate_fkey` FOREIGN KEY (`idAffiliate`) REFERENCES `affiliate`(`idAffiliate`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Users` ADD CONSTRAINT `Users_idUserRegion_fkey` FOREIGN KEY (`idUserRegion`) REFERENCES `region`(`idRegion`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_idUser_fkey` FOREIGN KEY (`idUser`) REFERENCES `Users`(`idUser`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `affiliate` ADD CONSTRAINT `affiliate_idAgency_fkey` FOREIGN KEY (`idAgency`) REFERENCES `agency`(`idAgency`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client` ADD CONSTRAINT `client_idcountry_citizenship_fkey` FOREIGN KEY (`idcountry_citizenship`) REFERENCES `country`(`idCountry`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client` ADD CONSTRAINT `client_idcountry_residence_fkey` FOREIGN KEY (`idcountry_residence`) REFERENCES `country`(`idCountry`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `address` ADD CONSTRAINT `address_idClient_fkey` FOREIGN KEY (`idClient`) REFERENCES `client`(`idClient`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_dependents` ADD CONSTRAINT `client_dependents_idTransaction_fkey` FOREIGN KEY (`idTransaction`) REFERENCES `transaction`(`idTransaction`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_idProvider_fkey` FOREIGN KEY (`idProvider`) REFERENCES `provider`(`idProvider`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_idCatPeriodo_fkey` FOREIGN KEY (`idCatPeriodo`) REFERENCES `cat_periodo`(`idCatPeriodo`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission` ADD CONSTRAINT `commission_idProduct_fkey` FOREIGN KEY (`idProduct`) REFERENCES `products`(`idProduct`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction` ADD CONSTRAINT `transaction_idClient_fkey` FOREIGN KEY (`idClient`) REFERENCES `client`(`idClient`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_transaction` ADD CONSTRAINT `product_transaction_idTransaction_fkey` FOREIGN KEY (`idTransaction`) REFERENCES `transaction`(`idTransaction`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_transaction` ADD CONSTRAINT `product_transaction_idProduct_fkey` FOREIGN KEY (`idProduct`) REFERENCES `products`(`idProduct`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_idProductTransaction_fkey` FOREIGN KEY (`idProductTransaction`) REFERENCES `product_transaction`(`idProductTransaction`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_tracking_events` ADD CONSTRAINT `payment_tracking_events_idPayment_fkey` FOREIGN KEY (`idPayment`) REFERENCES `payments`(`idPayment`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coverage_period` ADD CONSTRAINT `coverage_period_idPayment_fkey` FOREIGN KEY (`idPayment`) REFERENCES `payments`(`idPayment`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_records` ADD CONSTRAINT `commission_records_idProductTransaction_fkey` FOREIGN KEY (`idProductTransaction`) REFERENCES `product_transaction`(`idProductTransaction`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_records` ADD CONSTRAINT `commission_records_idPayment_fkey` FOREIGN KEY (`idPayment`) REFERENCES `payments`(`idPayment`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_records` ADD CONSTRAINT `commission_records_idAffiliate_fkey` FOREIGN KEY (`idAffiliate`) REFERENCES `affiliate`(`idAffiliate`) ON DELETE SET NULL ON UPDATE CASCADE;
