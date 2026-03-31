export type HostGroup = 'A' | 'B' | 'C';

export interface Host {
  id: string;
  name: string;
  phone?: string;
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
  capital: number;
  totalSessions: number;
  schedule: Schedule;
  financials: { [key: string]: FinancialRecord }; // "day-shiftIndex" -> FinancialRecord
  lockedHosts: string[]; // array of hostIds
}

export interface AppState {
  hosts: Host[];
  sessions: MonthSession[];
  currentSessionId: string | null;
}
