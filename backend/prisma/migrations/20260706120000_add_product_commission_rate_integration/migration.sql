-- Per-product commission rates now come from Helix (versioned, flat amount per periodUnit).
-- No local replication of the rate table: only the resolved amount and the Helix
-- idProductCommissionRate used (for later confirmation reporting) are stored.

-- affiliateAmount/agencyAmount become nullable: a NULL means "no rate defined yet in Helix
-- for this product/date", which must never be treated as $0.
ALTER TABLE `commission_records`
    MODIFY `affiliateAmount` DECIMAL(10, 2) NULL,
    MODIFY `agencyAmount` DECIMAL(10, 2) NULL,
    ADD COLUMN `idAffiliateProductCommissionRate` INTEGER NULL,
    ADD COLUMN `idAgencyProductCommissionRate` INTEGER NULL;
