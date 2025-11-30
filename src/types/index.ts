export interface Office {
  id: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  office: string; // ID офиса
  expand?: {
    office?: Office;
  };
}

export interface Contract {
  id: string;
  name: string;
  office: string; // ID офиса
  created_by: string; // ID пользователя
  brutto_price: number;
  netto_price: number;
  currency: string;
  is_deleted: boolean;
  created: string;
  expand?: {
    office?: Office;
    created_by?: User;
    "created_by.office"?: Office;
  };
}

export interface ExchangeRateData {
  buy?: number;
  sell?: number;
  [key: string]: number | undefined;
}

export interface ExchangeRates {
  [currency: string]: number | ExchangeRateData;
}

export interface LeaderboardOfficeData {
  officeId: string;
  officeName: string;
  totalCommissionUSD: number;
  contractCount: number;
  rank: number;
  isCurrentOffice: boolean;
}

export interface LeaderboardManagerData {
  managerId: string;
  managerName: string;
  officeName: string;
  totalCommissionUSD: number;
  contractCount: number;
  rank: number;
  isCurrentUser: boolean;
}

export interface AuthResponse {
  token: string;
  record: User;
}
