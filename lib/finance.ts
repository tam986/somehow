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

export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'decimal',
        maximumFractionDigits: 0,
    }).format(amount);
};

export const parseCurrency = (value: string): number => {
    return parseInt(value.replace(/[,.\s]/g, "")) || 0;
};
