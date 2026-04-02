export type HostGroup = 'A' | 'B' | 'C';

export interface Host {
  id: string;
  name: string;
  phone?: string;
  gender?: 'male' | 'female';
  group: HostGroup;
  color: string;
  bgColor: string;
  note?: string;
  baseSalary?: number;
}

export interface Shift {
  id: number;
  name: string;
  time: string;
  isNight?: boolean;
  isBest?: boolean;
}

export interface FinancialRecord {
  gmv: number;
  ads: number;
  cast: number;
  tro: number;
  ot: number;
  fees?: number;
  grossProfit?: number;
  platformProfit?: number;
  tiktokProfit?: number;
  companyProfit?: number;
}

export interface KolFinancialRecord {
  id: string;
  date: string;
  time: string;
  cast: number;
  tro: number;
  gmv: number;
  ads: number;
}

export interface Schedule {
  [key: string]: string | null; // "day-shiftIndex" -> hostId
}

export interface MonthSession {
  id: string;
  name: string; // e.g., "Tháng 3 - 2026"
  month: number; // 1-12
  year: number;
  days: number;
  capital: number; // Mặc định/Tương thích cũ
  capitalFemale: number;
  capitalMale: number;
  totalSessions: number; // Mặc định/Tương thích cũ
  totalSessionsFemale: number;
  totalSessionsMale: number;
  schedule: Schedule;
  financials: { [key: string]: FinancialRecord }; // "day-shiftIndex" -> FinancialRecord
  kolFinancials: KolFinancialRecord[];
  lockedHosts: string[]; // array of hostIds
  gmvMaxWomen?: FinancialRecord;
  gmvMaxMen?: FinancialRecord;
  kolCompanyProfitWomen?: number;
  kolCompanyProfitMen?: number;
}

export interface AppState {
  hosts: Host[];
  sessions: MonthSession[];
  currentSessionId: string | null;
}
