import { FinancialRecord } from "@/types";
import { OPERATIONAL_COST } from "./constants";

export interface CalcResult {
    fees: number;
    grossProfit: number;
    platformProfit: number;
    tiktokProfit: number;
    companyProfit: number;
}

export const calculateSessionFinance = (
    record: FinancialRecord,
    perShiftCostAllocation: number
): CalcResult => {
    const { gmv, ads, cast, tro, ot } = record;

    const fees = Math.round(gmv * 0.17);
    const grossProfit = Math.round(gmv * 0.39);
    const platformProfit = grossProfit - fees - ads;
    const tiktokProfit = platformProfit - cast - tro - ot;
    const companyProfit = tiktokProfit - perShiftCostAllocation;

    return {
        fees,
        grossProfit,
        platformProfit,
        tiktokProfit,
        companyProfit
    };
};

export const computeRankedHosts = (hosts: any[], sessions: any[], filterSessionId: string | 'all' = 'all') => {
  const incomes: Record<string, number> = {};
  hosts.forEach(h => incomes[h.id] = 0);

  const targetSessions = filterSessionId === 'all' ? sessions : sessions.filter(s => s.id === filterSessionId);

  targetSessions.forEach(session => {
    Object.entries(session.financials).forEach(([key, record]: [string, any]) => {
      const hostId = session.schedule[key];
      if (hostId && incomes[hostId] !== undefined) {
        const res = calculateSessionFinance(record, 0); // Capital doesn't affect TikTok profit
        incomes[hostId] += res.tiktokProfit;
      }
    });
  });

  const ranked = [...hosts].sort((a, b) => incomes[b.id] - incomes[a.id]);

  return ranked.map((host, index) => {
    let group = 'C';
    if (index < 4) group = 'A';
    else if (index < 9) group = 'B';
    return { ...host, group, computedIncome: incomes[host.id] };
  });
};

export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'decimal',
        maximumFractionDigits: 0,
    }).format(amount);
};

export const parseCurrency = (value: string): number => {
    return parseInt(value.replace(/[,.\s]/g, "")) || 0;
};
