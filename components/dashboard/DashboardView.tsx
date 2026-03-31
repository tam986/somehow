'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/lib/store';
import { calculateSessionFinance, formatCurrency } from '@/lib/finance';
import { OPERATIONAL_COST } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Download, TrendingUp, Award, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

export default function DashboardView() {
  const { state } = useApp();
  const currentSession = state.sessions.find(s => s.id === state.currentSessionId);
  const hosts = state.hosts;

  const hostStats = useMemo(() => {
    if (!currentSession) return [];

    const stats: any = {};
    hosts.forEach(h => {
      stats[h.id] = {
        host: h,
        count: 0,
        gmv: 0,
        ads: 0,
        cpHost: 0,
        lnSan: 0,
        lnTikTok: 0,
        lnCty: 0,
      };
    });

    const totalShiftsAssigned = Object.values(currentSession.schedule).filter(id => id !== null).length;
    const perShiftCost = totalShiftsAssigned > 0 ? OPERATIONAL_COST / totalShiftsAssigned : 0;

    Object.entries(currentSession.schedule).forEach(([key, hostId]) => {
      if (!hostId || !stats[hostId]) return;

      const record = currentSession.financials[key] || { gmv: 0, ads: 0, cast: 0, tro: 0, ot: 0 };
      const res = calculateSessionFinance(record, perShiftCost);

      stats[hostId].count += 1;
      stats[hostId].gmv += record.gmv;
      stats[hostId].ads += record.ads;
      stats[hostId].cpHost += (record.cast + record.tro + record.ot);
      stats[hostId].lnSan += res.platformProfit;
      stats[hostId].lnTikTok += res.tiktokProfit;
      stats[hostId].lnCty += res.companyProfit;
    });

    return Object.values(stats)
      .filter((s: any) => s.count > 0)
      .map((s: any) => ({
        ...s,
        lnTkPerShift: s.count > 0 ? s.lnTikTok / s.count : 0
      }))
      .sort((a: any, b: any) => b.lnTkPerShift - a.lnTkPerShift);
  }, [currentSession, hosts]);

  const totals = useMemo(() => {
    return hostStats.reduce((acc: any, curr: any) => ({
      count: acc.count + curr.count,
      gmv: acc.gmv + curr.gmv,
      ads: acc.ads + curr.ads,
      cpHost: acc.cpHost + curr.cpHost,
      lnSan: acc.lnSan + curr.lnSan,
      lnTikTok: acc.lnTikTok + curr.lnTikTok,
      lnCty: acc.lnCty + curr.lnCty,
    }), { count: 0, gmv: 0, ads: 0, cpHost: 0, lnSan: 0, lnTikTok: 0, lnCty: 0 });
  }, [hostStats]);

  const exportExcel = () => {
    if (!currentSession) return;
    
    const data = hostStats.map((s: any) => ({
      "Host": s.host.name,
      "Phân Loại": s.host.group,
      "Số Ca": s.count,
      "Tổng GMV": s.gmv,
      "Chi phí ADS": s.ads,
      "CP Host (Cast/Trợ/OT)": s.cpHost,
      "LN Sàn": s.lnSan,
      "LN TikTok": s.lnTikTok,
      "LN Công Ty": s.lnCty,
      "LN TK/Phiên": Math.round(s.lnTkPerShift)
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tong Hop");
    XLSX.writeFile(wb, `Bao_Cao_${currentSession.name.replace(/\s+/g, '_')}.xlsx`);
  };

  if (!currentSession) return null;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <Award className="text-yellow-500" />
          BẢNG TỔNG HỢP HIỆU SUẤT HOST
        </h1>
        <Button onClick={exportExcel} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Download size={18} />
          Xuất Báo Cáo Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-subtle border-none overflow-hidden">
          <CardHeader className="bg-slate-900 text-white py-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest">
              <TrendingUp size={16} />
              Xếp Hạng Host Theo LN TikTok / Ca
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="p-3 text-left w-10">#</th>
                  <th className="p-3 text-left">Host</th>
                  <th className="p-3 text-center">Số Ca</th>
                  <th className="p-3 text-right">GMV</th>
                  <th className="p-3 text-right">ADS</th>
                  <th className="p-3 text-right">CP Host</th>
                  <th className="p-3 text-right">LN Sàn</th>
                  <th className="p-3 text-right font-bold text-emerald-600">LN TikTok</th>
                  <th className="p-3 text-right font-bold text-blue-600">LN Công Ty</th>
                  <th className="p-3 text-right bg-yellow-50 font-black text-slate-900">LN TK/p</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {hostStats.map((s: any, idx: number) => (
                  <tr key={s.host.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-slate-400 font-bold">{idx + 1}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.host.color }}></div>
                        <span className="font-bold">{s.host.name}</span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[8px] font-black",
                          s.host.group === 'A' ? "bg-green-100 text-green-700" :
                          s.host.group === 'B' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                        )}>
                          {s.host.group}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-center font-bold tabular-nums">{s.count}</td>
                    <td className="p-3 text-right tabular-nums">{formatCurrency(s.gmv)}</td>
                    <td className="p-3 text-right tabular-nums text-red-500">{formatCurrency(s.ads)}</td>
                    <td className="p-3 text-right tabular-nums">{formatCurrency(s.cpHost)}</td>
                    <td className="p-3 text-right tabular-nums">{formatCurrency(s.lnSan)}</td>
                    <td className={cn("p-3 text-right font-bold tabular-nums", s.lnTikTok < 0 ? "text-red-500" : "text-emerald-600")}>
                      {formatCurrency(s.lnTikTok)}
                    </td>
                    <td className={cn("p-3 text-right font-bold tabular-nums", s.lnCty < 0 ? "text-red-500" : "text-blue-600")}>
                      {formatCurrency(s.lnCty)}
                    </td>
                    <td className="p-3 text-right tabular-nums bg-yellow-50/50 font-black text-slate-900 border-l border-yellow-100 italic">
                      {formatCurrency(s.lnTkPerShift)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-bold uppercase">
                <tr>
                  <td colSpan={2} className="p-4 text-center">TỔNG CỘNG</td>
                  <td className="p-4 text-center">{totals.count}</td>
                  <td className="p-4 text-right">{formatCurrency(totals.gmv)}</td>
                  <td className="p-4 text-right">{formatCurrency(totals.ads)}</td>
                  <td className="p-4 text-right">{formatCurrency(totals.cpHost)}</td>
                  <td className="p-4 text-right">{formatCurrency(totals.lnSan)}</td>
                  <td className="p-4 text-right text-emerald-400">{formatCurrency(totals.lnTikTok)}</td>
                  <td className="p-4 text-right text-blue-400">{formatCurrency(totals.lnCty)}</td>
                  <td className="p-4 text-right bg-yellow-600 text-white">
                    {formatCurrency(totals.count > 0 ? totals.lnTikTok / totals.count : 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-subtle border-none">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Target className="text-primary" />
                PHÂN TÍCH NHÓM
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {['A', 'B', 'C'].map(group => {
                const groupStats = hostStats.filter((s: any) => s.host.group === group);
                const groupGMV = groupStats.reduce((sum: number, s: any) => sum + s.gmv, 0);
                const groupCount = groupStats.reduce((sum: number, s: any) => sum + s.count, 0);
                const perc = totals.gmv > 0 ? (groupGMV / totals.gmv) * 100 : 0;

                return (
                  <div key={group} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="flex items-center gap-2">
                        Nhóm {group} <span className="font-normal text-muted-foreground">({groupCount} ca)</span>
                      </span>
                      <span>{perc.toFixed(1)}% GMV</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          group === 'A' ? "bg-green-500" : group === 'B' ? "bg-blue-500" : "bg-slate-400"
                        )}
                        style={{ width: `${perc}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-none shadow-xl text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Award size={100} />
            </div>
            <CardHeader>
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Host Xuất Sắc Nhất</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {hostStats.length > 0 ? (
                <>
                  <p className="text-3xl font-black text-white italic">{hostStats[0].host.name}</p>
                  <p className="text-sm text-emerald-400 font-bold mt-2 flex items-center gap-1">
                    <TrendingUp size={14} />
                    {formatCurrency(hostStats[0].lnTkPerShift)} / Ca live
                  </p>
                  <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Tổng GMV</p>
                        <p className="font-black text-sm">{formatCurrency(hostStats[0].gmv)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Số ca live</p>
                        <p className="font-black text-sm">{hostStats[0].count}</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-500 italic">Chưa có dữ liệu phân tích</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
