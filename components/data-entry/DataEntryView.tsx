'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/lib/store';
import { SHIFTS, DAY_NAMES, OPERATIONAL_COST } from '@/lib/constants';
import { formatCurrency, parseCurrency, calculateSessionFinance } from '@/lib/finance';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { TrendingUp, DollarSign, PieChart, Users } from 'lucide-react';

export default function DataEntryView() {
  const { state, updateFinancials, updateSessionMeta, updateSupportSalary } = useApp();
  const currentSession = state.sessions.find(s => s.id === state.currentSessionId);
  const hosts = state.hosts;

  const [genderFilter, setGenderFilter] = useState<'female' | 'male'>('female');

  const capital = genderFilter === 'female' 
    ? (currentSession?.capitalFemale ?? currentSession?.capital ?? 15480000)
    : (currentSession?.capitalMale ?? currentSession?.capital ?? 15480000);
    
  const totalSessions = genderFilter === 'female'
    ? (currentSession?.totalSessionsFemale ?? currentSession?.totalSessions ?? 129)
    : (currentSession?.totalSessionsMale ?? currentSession?.totalSessions ?? 129);

  const totalShiftsAssigned = useMemo(() => {
    if (!currentSession) return 0;
    return Object.entries(currentSession.schedule).filter(([key, id]) => {
      return id !== null && key.endsWith(`-${genderFilter}`);
    }).length;
  }, [currentSession, genderFilter]);

  const perShiftCostAllocation = useMemo(() => {
    return totalSessions > 0 ? capital / totalSessions : 0;
  }, [capital, totalSessions]);

  const totalSessionsWomen = currentSession?.totalSessionsFemale ?? currentSession?.totalSessions ?? 129;
  const totalSessionsMen = currentSession?.totalSessionsMale ?? currentSession?.totalSessions ?? 129;
  const totalSessionsAll = totalSessionsWomen + totalSessionsMen;
  const supportSalary = currentSession?.supportSalary ?? 0;
  const supportPerShift = useMemo(() => {
    return totalSessionsAll > 0 ? supportSalary / totalSessionsAll : 0;
  }, [supportSalary, totalSessionsAll]);

  const summary = useMemo(() => {
    if (!currentSession) return null;
    let totalGMV = 0;
    let totalTikTokLN = 0;
    let totalCompanyLN = 0;

    Object.entries(currentSession.financials).forEach(([key, record]) => {
      if (!key.endsWith(`-${genderFilter}`)) return;
      const hostId = currentSession.schedule[key];
      if (!hostId) return;

      const res = calculateSessionFinance(record, perShiftCostAllocation, supportPerShift);
      totalGMV += record.gmv;
      totalTikTokLN += res.tiktokProfit;
      totalCompanyLN += res.companyProfit;
    });

    return { totalGMV, totalTikTokLN, totalCompanyLN };
  }, [currentSession, perShiftCostAllocation, supportPerShift, genderFilter]);

  if (!currentSession) return null;

  const handleInputChange = (day: number, shift: number, field: any, value: string) => {
    const numValue = parseCurrency(value);
    updateFinancials(currentSession.id, day, shift, genderFilter, field, numValue);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-center gap-4">
        <div className="flex bg-slate-100 p-1 rounded-lg w-max shadow-sm border">
          <button 
            className={cn("px-6 py-2 text-sm font-bold rounded-md transition-all flex items-center gap-2", genderFilter === 'female' ? "bg-white shadow-sm text-pink-600" : "text-slate-500 hover:text-slate-800")}
            onClick={() => setGenderFilter('female')}
          >
            <Users size={16} />
            WOMEN
          </button>
          <button 
            className={cn("px-6 py-2 text-sm font-bold rounded-md transition-all flex items-center gap-2", genderFilter === 'male' ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-800")}
            onClick={() => setGenderFilter('male')}
          >
            <Users size={16} />
            MEN
          </button>
        </div>
      </div>

      {/* Session Settings */}
      <Card className="border shadow-sm bg-white">
        <CardContent className="p-4 flex flex-wrap gap-8 items-center">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase text-slate-500">Tiền Vốn (Tháng):</label>
            <Input 
              type="text" 
              className="w-40 h-8 text-right font-bold text-blue-700 bg-blue-50/50" 
              value={formatCurrency(capital)}
              onChange={(e) => updateSessionMeta(currentSession.id, parseCurrency(e.target.value), totalSessions, genderFilter)}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase text-slate-500">Tổng Số Phiên Live:</label>
            <Input 
              type="number" 
              className="w-32 h-8 text-right font-bold text-orange-700 bg-orange-50/50" 
              value={totalSessions || ''}
              onChange={(e) => updateSessionMeta(currentSession.id, capital, parseInt(e.target.value) || 0, genderFilter)}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase text-slate-500">Tiền Lương chung:</label>
            <Input 
              type="text" 
              className="w-40 h-8 text-right font-bold text-orange-700 bg-orange-50/50" 
              value={formatCurrency(supportSalary)}
              onChange={(e) => updateSupportSalary(currentSession.id, parseCurrency(e.target.value))}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase text-slate-500">Tiền Trợ / Ca:</label>
            <div className="w-32 h-8 flex items-center justify-end px-3 font-bold text-orange-950 bg-orange-100/50 rounded-md border border-orange-200">
              {formatCurrency(supportPerShift)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard 
          title="Tổng GMV" 
          value={formatCurrency(summary?.totalGMV || 0)} 
          icon={<TrendingUp className="text-blue-500" />} 
          color="blue"
        />
        <SummaryCard 
          title="LN TikTok" 
          value={formatCurrency(summary?.totalTikTokLN || 0)} 
          icon={<DollarSign className={cn(summary?.totalTikTokLN && summary.totalTikTokLN < 0 ? "text-red-500" : "text-green-500")} />} 
          color={summary?.totalTikTokLN && summary.totalTikTokLN < 0 ? "red" : "green"}
        />
        <SummaryCard 
          title="LN Công Ty" 
          value={formatCurrency(summary?.totalCompanyLN || 0)} 
          icon={<PieChart className={cn(summary?.totalCompanyLN && summary.totalCompanyLN < 0 ? "text-red-600" : "text-purple-500")} />} 
          color={summary?.totalCompanyLN && summary.totalCompanyLN < 0 ? "red" : "purple"}
        />
        <SummaryCard 
          title="Tổng Ca Live" 
          value={`${totalShiftsAssigned} Ca`} 
          icon={<Users className="text-orange-500" />} 
          color="orange"
          subtitle={`PB/Ca: ${formatCurrency(perShiftCostAllocation)}`}
        />
      </div>

      <Card className="border-none shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs min-w-[1200px]">
            <thead>
              <tr className="bg-slate-900 text-white uppercase tracking-wider">
                <th className="p-3 text-left w-24 lg:w-32 sticky left-0 z-20 bg-slate-900">Ngày / Ca</th>
                <th className="p-3 text-left w-20 lg:w-24">Host</th>
                <th className="p-3 text-center bg-blue-900/30">GMV</th>
                <th className="p-3 text-center bg-blue-900/30">ADS</th>
                <th className="p-3 text-center bg-blue-900/30">CAST</th>
                <th className="p-3 text-center bg-blue-900/30">TRỢ</th>
                <th className="p-3 text-center bg-blue-900/30">OT</th>
                <th className="p-3 text-center bg-green-900/30">Phí Sàn (17%)</th>
                <th className="p-3 text-center bg-green-900/30">LN Gộp (39%)</th>
                <th className="p-3 text-center bg-green-900/30 font-bold">LN Sàn</th>
                <th className="p-3 text-center bg-emerald-900/40 font-bold text-emerald-400 underline decoration-emerald-400">LN TikTok</th>
                <th className="p-3 text-center bg-emerald-900/40 font-black text-white">LN Công Ty</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {Array.from({ length: currentSession.days }, (_, i) => i + 1).map(day => (
                <React.Fragment key={day}>
                  {SHIFTS.map((shift, sIdx) => {
                    const key = `${day}-${shift.id}-${genderFilter}`;
                    const hostId = currentSession.schedule[key];
                    if (!hostId) return null; // Show only assigned shifts like original

                    const host = hosts.find(h => h.id === hostId);
                    const record = currentSession.financials[key] || { gmv: 0, ads: 0, cast: 0, tro: 0, ot: 0 };
                    const res = calculateSessionFinance(record, perShiftCostAllocation, supportPerShift);
                    
                    const isWeekend = new Date(currentSession.year, currentSession.month - 1, day).getDay() === 0;

                    return (
                      <tr key={key} className={cn("border-b hover:bg-slate-50 transition-colors", isWeekend && "bg-slate-50/50")}>
                        <td className="p-2 border-r sticky left-0 z-10 bg-inherit font-medium border-b">
                          <div className="flex flex-col">
                            <span className={cn("text-[10px] font-bold", isWeekend ? "text-red-500" : "text-muted-foreground")}>
                              {day}/{currentSession.month} ({DAY_NAMES[new Date(currentSession.year, currentSession.month-1, day).getDay()]})
                            </span>
                            <span className="text-xs">{shift.name} ({shift.time})</span>
                          </div>
                        </td>
                        <td className="p-1 border-r text-center">
                          <span className="font-bold text-[10px]" style={{ color: host?.color }}>{host?.name}</span>
                        </td>
                        <td className="p-1 border-r bg-blue-50/30">
                          <Input 
                            className="h-8 text-right text-[11px] font-bold border-transparent focus:border-blue-300" 
                            value={record.gmv === 0 ? '' : formatCurrency(record.gmv)}
                            onChange={(e) => handleInputChange(day, shift.id, 'gmv', e.target.value)}
                          />
                        </td>
                        <td className="p-1 border-r bg-blue-50/30">
                          <Input 
                            className="h-8 text-right text-[11px] border-transparent focus:border-blue-300" 
                            value={record.ads === 0 ? '' : formatCurrency(record.ads)}
                            onChange={(e) => handleInputChange(day, shift.id, 'ads', e.target.value)}
                          />
                        </td>
                        <td className="p-1 border-r bg-blue-50/30">
                          <Input 
                            className="h-8 text-right text-[11px] border-transparent focus:border-blue-300" 
                            value={record.cast === 0 ? '' : formatCurrency(record.cast)}
                            onChange={(e) => handleInputChange(day, shift.id, 'cast', e.target.value)}
                          />
                        </td>
                        <td className="p-1 border-r bg-blue-50/30 text-right pr-3 font-bold text-slate-600">
                          {formatCurrency(supportPerShift)}
                        </td>
                        <td className="p-1 border-r bg-blue-50/30">
                          <Input 
                            className="h-8 text-right text-[11px] border-transparent focus:border-blue-300" 
                            value={record.ot === 0 ? '' : formatCurrency(record.ot)}
                            onChange={(e) => handleInputChange(day, shift.id, 'ot', e.target.value)}
                          />
                        </td>
                        <td className="p-2 text-right border-r font-medium text-slate-500 bg-green-50/20">{formatCurrency(res.fees)}</td>
                        <td className="p-2 text-right border-r font-medium text-slate-500 bg-green-50/20">{formatCurrency(res.grossProfit)}</td>
                        <td className="p-2 text-right border-r font-bold text-slate-700 bg-green-50/40">{formatCurrency(res.platformProfit)}</td>
                        <td className={cn(
                          "p-2 text-right border-r font-black",
                          res.tiktokProfit < 0 ? "bg-red-50 text-red-500" : "bg-emerald-50/50 text-emerald-600"
                        )}>
                          {formatCurrency(res.tiktokProfit)}
                        </td>
                        <td className={cn(
                          "p-2 text-right font-black border-b border-slate-700",
                          res.companyProfit < 0 ? "bg-red-950 text-red-400" : "bg-slate-900 text-emerald-400"
                        )}>
                          {formatCurrency(res.companyProfit)}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SummaryCard({ title, value, icon, color, subtitle }: any) {
  const colors: any = {
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    green: "bg-green-50 border-green-100 text-green-700",
    red: "bg-red-50 border-red-100 text-red-700",
    purple: "bg-purple-50 border-purple-100 text-purple-700",
    orange: "bg-orange-50 border-orange-100 text-orange-700",
  };

  return (
    <Card className={cn("border shadow-sm", colors[color])}>
      <CardContent className="p-4 flex justify-between items-center">
        <div>
          <p className="text-[10px] font-black uppercase opacity-60 mb-1">{title}</p>
          <p className="text-xl font-black tracking-tight leading-none">{value}</p>
          {subtitle && <p className="text-[10px] font-medium mt-1 opacity-80">{subtitle}</p>}
        </div>
        <div className="p-2 bg-white/50 rounded-lg shadow-inner">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
