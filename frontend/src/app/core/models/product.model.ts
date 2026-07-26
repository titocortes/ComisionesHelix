export interface CommissionRate {
  idCommissionRate: number;
  monthlySellerAmount: number;
  monthlyAffiliateAmount: number;
  monthlyAgencyAmount: number;
  active: boolean;
}

export interface ProductWithRate {
  idProduct: number;
  helixProductId: number | null;
  productName: string;
  shortName: string;
  active: boolean;
  commissionRate: CommissionRate | null;
}

export interface DependentDiscount {
  idDependentDiscount: number;
  idProduct: number;
  dependentNumber: number;
  discountPercentage: number;
  orMore: boolean;
}
