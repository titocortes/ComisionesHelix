export interface Client {
  idClient: number;
  firstName: string;
  lastName: string;
  email: string;
  idType: number;
  idNumber: string;
  mobile?: string;
  usa_mobile?: string;
  gender: string;
  fechaNacimiento?: string;
  visaType?: string;
  nombreSaludo?: string;
  source?: string;
  activo: boolean;
  assignedTo?: number;
  idcountry_citizenship?: number;
  idcountry_residence?: number;
  createdAt?: string;
}

export interface ClientListItem {
  idClient: number;
  firstName: string;
  lastName: string;
  email: string;
  idType: number;
  idNumber: string;
  mobile?: string;
  usa_mobile?: string;
  gender: string;
  activo: boolean;
  assignedTo?: number;
  source?: string;
  createdAt?: string;
}

export interface ClientListResponse {
  data: ClientListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface Country {
  idCountry: number;
  countryName: string;
  countryCode?: string;
}
