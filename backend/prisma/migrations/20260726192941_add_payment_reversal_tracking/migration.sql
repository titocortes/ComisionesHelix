-- DropIndex
DROP INDEX `address_idClient_fkey` ON `address`;

-- DropIndex
DROP INDEX `affiliate_idAgency_fkey` ON `affiliate`;

-- DropIndex
DROP INDEX `client_idcountry_citizenship_fkey` ON `client`;

-- DropIndex
DROP INDEX `client_idcountry_residence_fkey` ON `client`;

-- DropIndex
DROP INDEX `client_dependents_idTransaction_fkey` ON `client_dependents`;

-- DropIndex
DROP INDEX `commission_rates_idProduct_fkey` ON `commission_rates`;

-- DropIndex
DROP INDEX `commission_records_idAffiliateBeneficiary_fkey` ON `commission_records`;

-- DropIndex
DROP INDEX `commission_records_idAgencyBeneficiary_fkey` ON `commission_records`;

-- DropIndex
DROP INDEX `commission_records_idCancellationReason_fkey` ON `commission_records`;

-- DropIndex
DROP INDEX `commission_records_idPayment_fkey` ON `commission_records`;

-- DropIndex
DROP INDEX `commission_records_idSellerBeneficiary_fkey` ON `commission_records`;

-- DropIndex
DROP INDEX `commission_state_history_changedByUserId_fkey` ON `commission_state_history`;

-- DropIndex
DROP INDEX `commission_state_history_idCommissionRecord_fkey` ON `commission_state_history`;

-- DropIndex
DROP INDEX `payment_batch_items_idBeneficiary_fkey` ON `payment_batch_items`;

-- DropIndex
DROP INDEX `payment_batch_items_idPaymentBatch_fkey` ON `payment_batch_items`;

-- DropIndex
DROP INDEX `payment_batch_records_idCommissionRecord_fkey` ON `payment_batch_records`;

-- DropIndex
DROP INDEX `payment_tracking_events_idPayment_fkey` ON `payment_tracking_events`;

-- DropIndex
DROP INDEX `payments_helixPaymentId_key` ON `payments`;

-- DropIndex
DROP INDEX `payments_idCronLog_fkey` ON `payments`;

-- DropIndex
DROP INDEX `product_transaction_idProduct_fkey` ON `product_transaction`;

-- DropIndex
DROP INDEX `product_transaction_idTransaction_fkey` ON `product_transaction`;

-- DropIndex
DROP INDEX `products_idCatPeriodo_fkey` ON `products`;

-- DropIndex
DROP INDEX `products_idProvider_fkey` ON `products`;

-- DropIndex
DROP INDEX `refresh_tokens_idUser_fkey` ON `refresh_tokens`;

-- DropIndex
DROP INDEX `transaction_idClient_fkey` ON `transaction`;

-- DropIndex
DROP INDEX `Users_idAffiliate_fkey` ON `users`;

-- DropIndex
DROP INDEX `Users_idUserRegion_fkey` ON `users`;

-- DropIndex
DROP INDEX `Users_idUserRole_fkey` ON `users`;

-- AlterTable
ALTER TABLE `commission_records` ADD COLUMN `flaggedForReview` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `reviewNotes` TEXT NULL;

-- CreateTable
CREATE TABLE `payment_reversals` (
    `idPaymentReversal` INTEGER NOT NULL AUTO_INCREMENT,
    `idPayment` INTEGER NOT NULL,
    `previousPaymentStatus` INTEGER NOT NULL,
    `currentPaymentStatus` INTEGER NOT NULL,
    `reason` VARCHAR(50) NOT NULL,
    `helixReversedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payment_reversals_idPayment_key`(`idPayment`),
    PRIMARY KEY (`idPaymentReversal`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commission_adjustments` (
    `idCommissionAdjustment` INTEGER NOT NULL AUTO_INCREMENT,
    `idBeneficiary` INTEGER NOT NULL,
    `idCommissionRecord` INTEGER NOT NULL,
    `idPaymentReversal` INTEGER NOT NULL,
    `entityType` VARCHAR(20) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending_netting',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`idCommissionAdjustment`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `payments_helixPaymentId_idx` ON `payments`(`helixPaymentId`);

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
ALTER TABLE `commission_rates` ADD CONSTRAINT `commission_rates_idProduct_fkey` FOREIGN KEY (`idProduct`) REFERENCES `products`(`idProduct`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dependent_discounts` ADD CONSTRAINT `dependent_discounts_idProduct_fkey` FOREIGN KEY (`idProduct`) REFERENCES `products`(`idProduct`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction` ADD CONSTRAINT `transaction_idClient_fkey` FOREIGN KEY (`idClient`) REFERENCES `client`(`idClient`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_transaction` ADD CONSTRAINT `product_transaction_idTransaction_fkey` FOREIGN KEY (`idTransaction`) REFERENCES `transaction`(`idTransaction`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_transaction` ADD CONSTRAINT `product_transaction_idProduct_fkey` FOREIGN KEY (`idProduct`) REFERENCES `products`(`idProduct`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_idCronLog_fkey` FOREIGN KEY (`idCronLog`) REFERENCES `cron_execution_log`(`idCronLog`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_tracking_events` ADD CONSTRAINT `payment_tracking_events_idPayment_fkey` FOREIGN KEY (`idPayment`) REFERENCES `payments`(`idPayment`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `beneficiaries` ADD CONSTRAINT `beneficiaries_idUser_fkey` FOREIGN KEY (`idUser`) REFERENCES `Users`(`idUser`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_records` ADD CONSTRAINT `commission_records_idPayment_fkey` FOREIGN KEY (`idPayment`) REFERENCES `payments`(`idPayment`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_records` ADD CONSTRAINT `commission_records_idSellerBeneficiary_fkey` FOREIGN KEY (`idSellerBeneficiary`) REFERENCES `beneficiaries`(`idBeneficiary`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_records` ADD CONSTRAINT `commission_records_idAffiliateBeneficiary_fkey` FOREIGN KEY (`idAffiliateBeneficiary`) REFERENCES `beneficiaries`(`idBeneficiary`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_records` ADD CONSTRAINT `commission_records_idAgencyBeneficiary_fkey` FOREIGN KEY (`idAgencyBeneficiary`) REFERENCES `beneficiaries`(`idBeneficiary`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_records` ADD CONSTRAINT `commission_records_idCancellationReason_fkey` FOREIGN KEY (`idCancellationReason`) REFERENCES `cancellation_reasons`(`idCancellationReason`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_state_history` ADD CONSTRAINT `commission_state_history_idCommissionRecord_fkey` FOREIGN KEY (`idCommissionRecord`) REFERENCES `commission_records`(`idCommissionRecord`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_state_history` ADD CONSTRAINT `commission_state_history_changedByUserId_fkey` FOREIGN KEY (`changedByUserId`) REFERENCES `Users`(`idUser`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_reversals` ADD CONSTRAINT `payment_reversals_idPayment_fkey` FOREIGN KEY (`idPayment`) REFERENCES `payments`(`idPayment`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_adjustments` ADD CONSTRAINT `commission_adjustments_idBeneficiary_fkey` FOREIGN KEY (`idBeneficiary`) REFERENCES `beneficiaries`(`idBeneficiary`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_adjustments` ADD CONSTRAINT `commission_adjustments_idCommissionRecord_fkey` FOREIGN KEY (`idCommissionRecord`) REFERENCES `commission_records`(`idCommissionRecord`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_adjustments` ADD CONSTRAINT `commission_adjustments_idPaymentReversal_fkey` FOREIGN KEY (`idPaymentReversal`) REFERENCES `payment_reversals`(`idPaymentReversal`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_batch_items` ADD CONSTRAINT `payment_batch_items_idPaymentBatch_fkey` FOREIGN KEY (`idPaymentBatch`) REFERENCES `payment_batches`(`idPaymentBatch`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_batch_items` ADD CONSTRAINT `payment_batch_items_idBeneficiary_fkey` FOREIGN KEY (`idBeneficiary`) REFERENCES `beneficiaries`(`idBeneficiary`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_batch_records` ADD CONSTRAINT `payment_batch_records_idPaymentBatchItem_fkey` FOREIGN KEY (`idPaymentBatchItem`) REFERENCES `payment_batch_items`(`idPaymentBatchItem`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_batch_records` ADD CONSTRAINT `payment_batch_records_idCommissionRecord_fkey` FOREIGN KEY (`idCommissionRecord`) REFERENCES `commission_records`(`idCommissionRecord`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `payment_batch_records` RENAME INDEX `pbr_batchitem_commission_entity_uq` TO `payment_batch_records_idPaymentBatchItem_idCommissionRecord__key`;
