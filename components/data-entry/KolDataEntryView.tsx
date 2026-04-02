'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KolFinancialRecord } from '@/types';
import { formatCurrency, parseCurrency, calculateGenderTotalAndProfits, calculateKolFinance } from '@/lib/finance';

export default function KolDataEntryView() {
  const { state, saveKolFinancial, deleteKolFinancial } = useApp();
  const currentSession = state.sessions.find(s => s.id === state.currentSessionId);
  
  if (!currentSession) {
    return (
      <div className="p-8 text-center text-slate-500">
        Vui lòng chọn hoặc tạo một tháng làm việc mới để xem dữ liệu.
      </div>
    );
  }

  const kolRecords = currentSession.kolFinancials || [];
  
  const totals = React.useMemo(() => {
    return kolRecords.reduce((acc, curr) => {
      const g = Number(curr.gmv) || 0;
      const a = Number(curr.ads) || 0;
      const t = Number(curr.tro) || 0;
      const p = calculateKolFinance({ gmv: g, ads: a, tro: t });
      
      return {
        gmv: acc.gmv + g,
        ads: acc.ads + a,
        tro: acc.tro + t,
        cast: acc.cast + p.cast,
        fees: acc.fees + p.fees,
        grossProfit: acc.grossProfit + p.grossProfit,
        platformProfit: acc.platformProfit + p.platformProfit,
        tiktokProfit: acc.tiktokProfit + p.tiktokProfit
      };
    }, { gmv: 0, ads: 0, tro: 0, cast: 0, fees: 0, grossProfit: 0, platformProfit: 0, tiktokProfit: 0 });
  }, [kolRecords]);

  return (
    <div className="p-4 space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-200 shadow-sm gap-4">
        <div>
          <h2 className="text-lg lg:text-xl font-bold flex items-center gap-2 text-amber-800">
            <Star className="text-yellow-500" fill="currentColor" size={20} />
            KOL (Đoàn Huệ Vui)
          </h2>
          <p className="text-xs text-amber-700/70">Quản lý số liệu riêng biệt cho KOL</p>
        </div>
      </div>

      <Card className="border-none shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm min-w-[1000px]">
            <thead>
              <tr className="bg-slate-900 text-amber-50 uppercase text-xs tracking-wider">
                <th className="p-2 text-left w-24 sticky left-0 z-20 bg-slate-900 border-r border-slate-700">NGÀY</th>
                <th className="p-2 text-left w-24">THỜI GIAN</th>
                <th className="p-2 text-center">CAST HOST</th>
                <th className="p-2 text-center">GMV</th>
                <th className="p-2 text-center">ADS</th>
                <th className="p-2 text-right">PHÍ SÀN</th>
                <th className="p-2 text-right">LN GỘP</th>
                <th className="p-2 text-right">LN SÀN</th>
                <th className="p-2 text-right">LN TIKTOK</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {Array.from({ length: currentSession.days }, (_, i) => i + 1).map(day => {
                const id = String(day);
                const dateStr = `${day.toString().padStart(2, '0')}/${currentSession.month.toString().padStart(2, '0')}`;
                
                const record = kolRecords.find(r => r.id === id) || { 
                  id, 
                  date: dateStr,
                  time: '',
                  cast: 0,
                  tro: 0,
                  gmv: 0,
                  ads: 0
                };

                const g = Number(record.gmv) || 0;
                const a = Number(record.ads) || 0;
                const t = Number(record.tro) || 0;
                const p = calculateKolFinance({ gmv: g, ads: a, tro: t });

                const handleChange = (field: keyof KolFinancialRecord, value: any) => {
                  saveKolFinancial(currentSession.id, {
                    ...record,
                    [field]: value
                  });
                };

                return (
                  <tr key={day} className="border-b transition-colors hover:bg-amber-50/30">
                    <td className="p-2 border-r font-bold text-slate-700 bg-amber-50/50">
                      {record.date}
                    </td>
                    <td className="p-1 border-r">
                      <Input 
                        value={record.time || ''} 
                        onChange={e => handleChange('time', e.target.value)}
                        placeholder="VD: 2h"
                        className="h-8 text-center text-xs border-transparent focus:border-amber-300 shadow-none"
                      />
                    </td>
                    <td className="p-1 border-r bg-slate-50">
                      <Input 
                        readOnly
                        className="h-8 text-right font-medium text-xs border-transparent shadow-none bg-transparent cursor-not-allowed text-slate-500" 
                        value={formatCurrency(p.cast)}
                      />
                    </td>
                   
                    <td className="p-1 border-r bg-blue-50/30">
                      <Input 
                        className="h-8 text-right font-bold text-blue-800 text-xs border-transparent focus:border-blue-300 shadow-none" 
                        value={record.gmv === 0 ? '' : formatCurrency(record.gmv)}
                        onChange={(e) => handleChange('gmv', parseCurrency(e.target.value))}
                      />
                    </td>
                    <td className="p-1 border-r bg-red-50/30">
                      <Input 
                        className="h-8 text-right font-bold text-red-600 text-xs border-transparent focus:border-red-300 shadow-none" 
                        value={record.ads === 0 ? '' : formatCurrency(record.ads)}
                        onChange={(e) => handleChange('ads', parseCurrency(e.target.value))}
                      />
                    </td>
                    <td className="p-2 text-right border-r text-slate-600 font-medium">
                      {formatCurrency(p.fees)}
                    </td>
                    <td className="p-2 text-right border-r text-slate-600 font-medium">
                      {formatCurrency(p.grossProfit)}
                    </td>
                    <td className="p-2 text-right border-r text-slate-800 font-bold bg-amber-50/30">
                      {formatCurrency(p.platformProfit)}
                    </td>
                    <td className={cn(
                      "p-2 text-right border-r font-black",
                      p.tiktokProfit < 0 ? "text-red-500 bg-red-50" : "text-emerald-600 bg-emerald-50/30"
                    )}>
                      {formatCurrency(p.tiktokProfit)}
                    </td>
                 
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="sticky bottom-0 z-10">
              <tr className="bg-slate-900 text-white font-bold">
                <td colSpan={2} className="p-3 text-center uppercase tracking-wider border-r border-slate-700">TỔNG CỘNG</td>
                <td className="p-3 text-right border-r border-slate-700">{formatCurrency(totals.cast)}</td>
                <td className="p-3 text-right border-r border-slate-700 text-blue-400">{formatCurrency(totals.gmv)}</td>
                <td className="p-3 text-right border-r border-slate-700 text-red-400">{formatCurrency(totals.ads)}</td>
                <td className="p-3 text-right border-r border-slate-700 text-slate-300">{formatCurrency(totals.fees)}</td>
                <td className="p-3 text-right border-r border-slate-700 text-slate-300">{formatCurrency(totals.grossProfit)}</td>
                <td className="p-3 text-right border-r border-slate-700 text-amber-400">{formatCurrency(totals.platformProfit)}</td>
                <td className={cn(
                  "p-3 text-right border-r border-slate-700",
                  totals.tiktokProfit < 0 ? "text-red-400" : "text-emerald-400"
                )}>
                  {formatCurrency(totals.tiktokProfit)}
                </td>
         
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
