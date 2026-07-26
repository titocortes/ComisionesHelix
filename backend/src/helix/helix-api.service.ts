import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';

export interface HelixInvoiceClient {
  idClient: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface HelixInvoiceTransaction {
  idTransaction: number;
  numDependents: number;
  totalPrice: string;
  coverageDays: number;
  coverageMonths: number;
}

export interface HelixInvoiceProductTransaction {
  idProductTransaction: number;
  productId: number;
  productName: string;
  price: string;
}

export interface HelixInvoiceAffiliate {
  idAffiliate: number;
  affiliateName: string;
  agency: {
    idAgency: number;
    agencyName: string;
  };
}

export interface HelixInvoiceUser {
  idUser: number;
  firstName: string;
  lastName: string;
  email: string;
  affiliate: HelixInvoiceAffiliate;
}

export interface HelixInvoice {
  idPayment: number;
  paymentStatus: number;
  paymentDate: string;
  paymentFrequency: string;
  coverageStartDate: string;
  coverageEndDate: string;
  amount: string;
  paidAmount: string | null;
  payoutDate: string | null;
  paymentOrder: number;
  paymentInstrument: string | null;
  finalFolioPaymentInstrument: string | null;
  idTraceAR: string | null;
  reference: string | null;
  invoiceLink: string | null;
  client: HelixInvoiceClient;
  transaction: HelixInvoiceTransaction;
  productTransaction: HelixInvoiceProductTransaction;
  user: HelixInvoiceUser | null;
}

export interface HelixTreeUser {
  idUser: number;
  firstName: string;
  lastName: string;
  email: string;
  active: boolean;
}

export interface HelixTreeAffiliate {
  idAffiliate: number;
  affiliateName: string;
  users: HelixTreeUser[];
}

export interface HelixTreeAgency {
  idAgency: number;
  agencyName: string;
  affiliates: HelixTreeAffiliate[];
}

export interface HelixActiveProduct {
  idProduct: number;
  productName: string;
  active: boolean;
}

export interface HelixPublicAgency {
  idAgency: number;
  agencyName: string;
  reportEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface HelixReversedPayment {
  idPayment: number;
  previousPaymentStatus: number;
  currentPaymentStatus: number;
  reversedAt: string;
  reason: string;
}

export interface HelixProductCommissionRate {
  idProductCommissionRate: number;
  idProduct: number;
  agencyCommission: string;
  affiliateCommission: string;
  periodUnit: 'day' | 'month';
  effectiveDate: string | null;
  endDate: string | null;
}

export interface HelixPublicAffiliate {
  idAffiliate: number;
  idAgency: number;
  affiliateName: string;
  reportEmail: string;
  agency: {
    idAgency: number;
    agencyName: string;
    reportEmail: string;
  };
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class HelixApiService {
  private readonly logger = new Logger(HelixApiService.name);

  async getAgencyTree(): Promise<HelixTreeAgency[]> {
    const url = `${process.env['HELIX_API_URL']}/api/v2/agencies/tree`;
    this.logger.log(`Fetching agency tree from Helix: ${url}`);

    const response = await axios.get<{ success: boolean; data: HelixTreeAgency[] }>(url, {
      headers: { 'x-api-key': process.env['HELIX_API_KEY'] },
      timeout: 30_000,
    });

    return response.data.data;
  }

  async getPendingInvoices(): Promise<HelixInvoice[]> {
    const url = `${process.env['HELIX_API_URL']}/api/v2/commissions/pending-invoices`;
    this.logger.log(`Fetching pending invoices from Helix: ${url}`);

    const response = await axios.get<{ success: boolean; count: number; data: HelixInvoice[] }>(
      url,
      {
        headers: { 'x-api-key': process.env['HELIX_API_KEY'] },
        timeout: 30_000,
      },
    );

    this.logger.log(`Received ${response.data.count} pending invoices from Helix`);
    return response.data.data;
  }

  async getReversedPayments(): Promise<HelixReversedPayment[]> {
    const url = `${process.env['HELIX_API_URL']}/api/v2/commissions/reversed-payments`;
    this.logger.log(`Fetching reversed payments from Helix: ${url}`);

    const response = await axios.get<{ success: boolean; count: number; data: HelixReversedPayment[] }>(
      url,
      {
        headers: { 'x-api-key': process.env['HELIX_API_KEY'] },
        timeout: 30_000,
      },
    );

    this.logger.log(`Received ${response.data.count} reversed payment(s) from Helix`);
    return response.data.data;
  }

  async getActiveProducts(): Promise<HelixActiveProduct[]> {
    const url = `${process.env['HELIX_API_URL']}/api/v2/commissions/products/active`;
    this.logger.log(`Fetching active products from Helix: ${url}`);

    const response = await axios.get<HelixActiveProduct[]>(url, {
      headers: { 'x-api-key': process.env['HELIX_API_KEY'] },
      timeout: 30_000,
    });

    return response.data ?? [];
  }

  async getPublicAgencies(): Promise<HelixPublicAgency[]> {
    const url = `${process.env['HELIX_API_URL']}/api/v2/public/agencies`;
    this.logger.log(`Fetching public agencies from Helix: ${url}`);

    const response = await axios.get<HelixPublicAgency[]>(url, {
      headers: { 'x-api-key': process.env['HELIX_API_KEY'] },
      timeout: 30_000,
    });

    return response.data ?? [];
  }

  async getPublicAffiliatesByAgency(idAgency: number): Promise<HelixPublicAffiliate[]> {
    const url = `${process.env['HELIX_API_URL']}/api/v2/public/agencies/${idAgency}/affiliates`;
    this.logger.log(`Fetching affiliates for agency ${idAgency} from Helix: ${url}`);

    const response = await axios.get<HelixPublicAffiliate[]>(url, {
      headers: { 'x-api-key': process.env['HELIX_API_KEY'] },
      timeout: 30_000,
    });

    return response.data ?? [];
  }

  async getProductCommissionRate(
    idProduct: number,
    date: string,
  ): Promise<HelixProductCommissionRate | null> {
    const url = `${process.env['HELIX_API_URL']}/api/v2/commissions/product-commission-rates/${idProduct}/effective?date=${date}`;
    this.logger.log(`Fetching product commission rate from Helix: ${url}`);

    const response = await axios.get<{ success: boolean; data: HelixProductCommissionRate | null }>(
      url,
      {
        headers: { 'x-api-key': process.env['HELIX_API_KEY'] },
        timeout: 30_000,
      },
    );

    return response.data.data;
  }

  async getAllPublicAffiliates(): Promise<HelixPublicAffiliate[]> {
    const agencies = await this.getPublicAgencies();
    const settled = await Promise.allSettled(
      agencies.map(a => this.getPublicAffiliatesByAgency(a.idAgency)),
    );

    const affiliates: HelixPublicAffiliate[] = [];
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        affiliates.push(...result.value);
      } else {
        this.logger.warn(`Failed to fetch affiliates for an agency: ${result.reason}`);
      }
    }
    return affiliates;
  }
}
