'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '@/lib/store';
import { calculateSessionFinance, calculateGenderTotalAndProfits, formatCurrency, calculateKolFinance, parseCurrency } from '@/lib/finance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Download, TrendingUp, Award, Target, Calendar, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { FinancialRecord } from '@/types';

export default function DashboardView() {
  const { state, updateGmvMax, updateKolCompanyProfit } = useApp();
  const hosts = state.hosts;
  const [dashboardSessionId, setDashboardSessionId] = useState<string | 'all'>(state.currentSessionId || 'all');
  const [viewMode, setViewMode] = useState<'general' | 'gender'>('general');

  // Change dashboard filter when user selects a different session in the sidebar
  useEffect(() => {
    if (state.currentSessionId) {
      setDashboardSessionId(state.currentSessionId);
    }
  }, [state.currentSessionId]);

  // Khởi tạo options lọc
  const sessionOptions = useMemo(() => {
    return [...state.sessions].sort((a, b) => b.year === a.year ? b.month - a.month : b.year - a.year);
  }, [state.sessions]);

  // --------------- DỮ LIỆU GENERAL --------------- //
  const hostStats = useMemo(() => {
    const sessionsToAnalyze = dashboardSessionId === 'all' 
      ? state.sessions 
      : state.sessions.filter(s => s.id === dashboardSessionId);

    if (sessionsToAnalyze.length === 0) return [];

    const stats: any = {};
    hosts.forEach(h => {
      stats[h.id] = { host: h, count: 0, gmv: 0, ads: 0, cpHost: 0, lnSan: 0, lnTikTok: 0, lnCty: 0 };
    });

    sessionsToAnalyze.forEach(session => {
      Object.entries(session.schedule).forEach(([key, hostId]) => {
        if (!hostId || !stats[hostId]) return;

        const isMale = key.endsWith('-male');
        const capital = isMale 
          ? (session.capitalMale ?? session.capital ?? 15480000) 
          : (session.capitalFemale ?? session.capital ?? 15480000);
        const totalSessions = isMale
          ? (session.totalSessionsMale ?? session.totalSessions ?? 129)
          : (session.totalSessionsFemale ?? session.totalSessions ?? 129);
        const perShiftCost = totalSessions > 0 ? capital / totalSessions : 0;
        const supportSalary = session.supportSalary || 0;
        const totalSessionsAll = (session.totalSessionsFemale || 0) + (session.totalSessionsMale || 0);
        const supportPerShift = totalSessionsAll > 0 ? supportSalary / totalSessionsAll : 0;

        const record = session.financials[key] || { gmv: 0, ads: 0, cast: 0, tro: 0, ot: 0 };
        const res = calculateSessionFinance(record, perShiftCost, supportPerShift);

        stats[hostId].count += 1;
        stats[hostId].gmv += record.gmv;
        stats[hostId].ads += record.ads;
        stats[hostId].cpHost += (record.cast + supportPerShift + record.ot);
        stats[hostId].lnSan += res.platformProfit;
        stats[hostId].lnTikTok += res.tiktokProfit;
        stats[hostId].lnCty += res.companyProfit;
      });
    });

    return Object.values(stats)
      .filter((s: any) => s.count > 0)
      .sort((a: any, b: any) => b.lnCty - a.lnCty)
      .map((s: any, index) => {
        let currentGroup = 'C';
        if (index < 4) currentGroup = 'A';
        else if (index < 9) currentGroup = 'B';

        return {
          ...s,
          host: { ...s.host, group: currentGroup },
          lnTkPerShift: s.count > 0 ? s.lnTikTok / s.count : 0
        };
      });
  }, [dashboardSessionId, state.sessions, hosts]);

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


  // --------------- DỮ LIỆU GENDER --------------- //
  const genderStats = useMemo(() => {
    const sessionsToAnalyze = dashboardSessionId === 'all' 
      ? state.sessions 
      : state.sessions.filter(s => s.id === dashboardSessionId);

    const womenRaw = { gmv: 0, ads: 0, cast: 0, tro: 0, fees: 0, grossProfit: 0, platformProfit: 0, tiktokProfit: 0, lnCty: 0 };
    const menRaw = { gmv: 0, ads: 0, cast: 0, tro: 0, fees: 0, grossProfit: 0, platformProfit: 0, tiktokProfit: 0, lnCty: 0 };
    const kolRaw = { gmv: 0, ads: 0, cast: 0, tro: 0, lnCty: 0 }; 
    
    // gmvMax values (only if single session is selected)
    let womenGmvMaxRaw = { gmv: 0, ads: 0, cast: 0, tro: 0, fees: 0, grossProfit: 0, platformProfit: 0, tiktokProfit: 0, lnCty: 0 } as any;
    let menGmvMaxRaw = { gmv: 0, ads: 0, cast: 0, tro: 0, fees: 0, grossProfit: 0, platformProfit: 0, tiktokProfit: 0, lnCty: 0 } as any;

    sessionsToAnalyze.forEach(session => {
      Object.entries(session.schedule).forEach(([key, hostId]) => {
        if (!hostId) return;
        const host = hosts.find(h => h.id === hostId);
        if (!host) return;

        const record = session.financials[key] || { gmv: 0, ads: 0, cast: 0, tro: 0, ot: 0 };
        // Tính perShiftCost theo giới tính để LN CÔNG TY = LN TIKTOK - (vốn / số phiên)
        const isMale = key.endsWith('-male');
        const capital = isMale
          ? (session.capitalMale ?? session.capital ?? 15480000)
          : (session.capitalFemale ?? session.capital ?? 15480000);
        const totalSessionsGender = isMale
          ? (session.totalSessionsMale ?? session.totalSessions ?? 129)
          : (session.totalSessionsFemale ?? session.totalSessions ?? 129);
        const perShiftCost = totalSessionsGender > 0 ? capital / totalSessionsGender : 0;
        
        const supportSalary = session.supportSalary || 0;
        const totalSessionsAll = (session.totalSessionsFemale || 0) + (session.totalSessionsMale || 0);
        const supportPerShift = totalSessionsAll > 0 ? supportSalary / totalSessionsAll : 0;
        
        const res = calculateSessionFinance(record, perShiftCost, supportPerShift);
        
        const target = host.gender === 'male' ? menRaw : womenRaw;
        target.gmv += record.gmv;
        target.ads += record.ads;
        target.cast += record.cast;
        target.tro += supportPerShift;
        target.fees += res.fees;
        target.grossProfit += res.grossProfit;
        target.platformProfit += res.platformProfit;
        target.tiktokProfit += res.tiktokProfit;
        target.lnCty += res.companyProfit;
      });

      // kol
      (session.kolFinancials || []).forEach(record => {
          const kolRes = calculateKolFinance(record);
          kolRaw.gmv += record.gmv;
          kolRaw.ads += record.ads;
          kolRaw.cast += kolRes.cast;
          // kolRaw.tro không tích lũy vì KOL không có tiền trợ live
          kolRaw.lnCty += kolRes.companyProfit;
      });

      // gmvMax accumulate (if 'all', otherwise we take from current session below)
      if (dashboardSessionId === 'all') {
        const wMax = session.gmvMaxWomen || { gmv: 0, ads: 0, cast: 0, tro: 0, ot: 0 };
        const wFees = Math.round((wMax.gmv || 0) * 0.17);
        const wGross = Math.round((wMax.gmv || 0) * 0.39);
        const wPlatform = wGross - wFees - (wMax.ads || 0);
        womenGmvMaxRaw.gmv += wMax.gmv;
        womenGmvMaxRaw.ads += wMax.ads;
        womenGmvMaxRaw.cast += wMax.cast;
        womenGmvMaxRaw.tro += wMax.tro;
        womenGmvMaxRaw.fees += wFees;
        womenGmvMaxRaw.grossProfit += wGross;
        womenGmvMaxRaw.platformProfit += wPlatform;
        womenGmvMaxRaw.tiktokProfit += wPlatform;
        womenGmvMaxRaw.lnCty += wPlatform;

        const mMax = session.gmvMaxMen || { gmv: 0, ads: 0, cast: 0, tro: 0, ot: 0 };
        const mFees = Math.round((mMax.gmv || 0) * 0.17);
        const mGross = Math.round((mMax.gmv || 0) * 0.39);
        const mPlatform = mGross - mFees - (mMax.ads || 0);
        menGmvMaxRaw.gmv += mMax.gmv;
        menGmvMaxRaw.ads += mMax.ads;
        menGmvMaxRaw.cast += mMax.cast;
        menGmvMaxRaw.tro += mMax.tro;
        menGmvMaxRaw.fees += mFees;
        menGmvMaxRaw.grossProfit += mGross;
        menGmvMaxRaw.platformProfit += mPlatform;
        menGmvMaxRaw.tiktokProfit += mPlatform;
        menGmvMaxRaw.lnCty += mPlatform;
      }
    });

    // If single session, get fixed values for GMV MAX from that session
    if (dashboardSessionId !== 'all') {
      const currentSession = sessionsToAnalyze[0];
      const wMax = currentSession?.gmvMaxWomen || { gmv: 0, ads: 0, cast: 0, tro: 0, ot: 0 };
      const wFees = Math.round((wMax.gmv || 0) * 0.17);
      const wGross = Math.round((wMax.gmv || 0) * 0.39);
      const wPlatform = wGross - wFees - (wMax.ads || 0);
      womenGmvMaxRaw = { ...wMax, fees: wFees, grossProfit: wGross, platformProfit: wPlatform, tiktokProfit: wPlatform, lnCty: wPlatform };

      const mMax = currentSession?.gmvMaxMen || { gmv: 0, ads: 0, cast: 0, tro: 0, ot: 0 };
      const mFees = Math.round((mMax.gmv || 0) * 0.17);
      const mGross = Math.round((mMax.gmv || 0) * 0.39);
      const mPlatform = mGross - mFees - (mMax.ads || 0);
      menGmvMaxRaw = { ...mMax, fees: mFees, grossProfit: mGross, platformProfit: mPlatform, tiktokProfit: mPlatform, lnCty: mPlatform };
    }

    const calcObjForKol = (raw: any, gender: 'female' | 'male') => {
      const currentSession = sessionsToAnalyze[0];
      const manualProfit = currentSession ? (gender === 'female' ? currentSession.kolCompanyProfitWomen : currentSession.kolCompanyProfitMen) : 0;
      const p = calculateGenderTotalAndProfits(raw.gmv, raw.ads, raw.cast, raw.tro);
      // If single session, use manual override. If 'all', sum them (handled by the loop above + manual sum logic if needed)
      // Actually if 'all', we should accumulated manual profits too.
      let totalManualProfit = manualProfit || 0;
      if (dashboardSessionId === 'all') {
         totalManualProfit = sessionsToAnalyze.reduce((sum, s) => sum + (gender === 'female' ? (s.kolCompanyProfitWomen || 0) : (s.kolCompanyProfitMen || 0)), 0);
      }

      return { ...raw, ...p, lnCty: totalManualProfit };
    };

    const kolComputed = calcObjForKol(kolRaw, 'female');
    const menKolComputed = calcObjForKol({ gmv: 0, ads: 0, cast: 0, tro: 0 }, 'male');

    const sumRows = (row1: any, row2: any) => ({
      gmv: row1.gmv + row2.gmv,
      ads: row1.ads + row2.ads,
      cast: row1.cast + row2.cast,
      tro: row1.tro + row2.tro,
      fees: row1.fees + row2.fees,
      grossProfit: row1.grossProfit + row2.grossProfit,
      platformProfit: row1.platformProfit + row2.platformProfit,
      tiktokProfit: row1.tiktokProfit + row2.tiktokProfit,
      lnCty: (row1.lnCty || 0) + (row2.lnCty || 0)
    });
    
    const womenTotal = sumRows(sumRows(womenRaw, kolComputed), womenGmvMaxRaw);
    const menTotal = sumRows(sumRows(menRaw, menKolComputed), menGmvMaxRaw);
    
    const totalAll = sumRows(womenTotal, menTotal);

    return {
      womenStream: womenRaw,
      womenKol: kolComputed,
      womenGmvMax: womenGmvMaxRaw,
      womenTotal,
      menStream: menRaw,
      menKol: menKolComputed,
      menGmvMax: menGmvMaxRaw,
      menTotal,
      totalAll
    };
  }, [dashboardSessionId, state.sessions, hosts]);


  const exportExcel = () => {
    if (hostStats.length === 0) return;
    
    const sessionName = dashboardSessionId === 'all' 
      ? "Tat_Ca_Cac_Thang" 
      : state.sessions.find(s => s.id === dashboardSessionId)?.name.replace(/\s+/g, '_') || "Export";
    
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
    XLSX.writeFile(wb, `Bao_Cao_${sessionName}.xlsx`);
  };

  const renderGenderRow = (title: string, data: any, options: { 
    isTotal?: boolean, 
    isGmvMax?: boolean, 
    isKol?: boolean,
    gender?: 'female' | 'male' 
  } = {}) => {
    const { isTotal = false, isGmvMax = false, isKol = false, gender } = options;
    const isEditable = (isGmvMax || isKol) && dashboardSessionId !== 'all' && gender;

    // Fields editable on GMV MAX row: gmv, cast, tro, ads
    const gmvMaxEditableFields: (keyof FinancialRecord)[] = ['gmv', 'cast', 'tro', 'ads'];
    const renderEditableCell = (field: keyof FinancialRecord, value: number, colorClass: string = "", alwaysEditable: boolean = false) => {
      const canEdit = alwaysEditable || (isGmvMax && isEditable && gmvMaxEditableFields.includes(field));
      if (!canEdit) return <span className={colorClass}>{formatCurrency(value)}</span>;
      return (
        <Input 
          className={cn("h-7 w-full text-right bg-white/10 border-white/20 text-white focus:bg-white/20 p-1 text-[11px]", colorClass)}
          value={value === 0 ? '' : formatCurrency(value)}
          onChange={(e) => updateGmvMax(dashboardSessionId as string, gender as any, field, parseCurrency(e.target.value))}
        />
      );
    };

    return (
      <tr className={cn(isTotal ? "bg-[#0f1b29] font-bold border-t border-[#1d4ed8]" : "")}>
        <td className="p-3 font-semibold w-40">{title}</td>
        <td className="p-2 text-right">{renderEditableCell('gmv', data.gmv)}</td>
        <td className="p-2 text-right">{renderEditableCell('cast', data.cast)}</td>
        <td className="p-2 text-right">{renderEditableCell('tro', data.tro)}</td>
        <td className="p-2 text-right">{renderEditableCell('ads', data.ads, "text-red-400")}</td>
        <td className="p-2 text-right">{renderEditableCell('fees', data.fees)}</td>
        <td className="p-2 text-right">{renderEditableCell('grossProfit', data.grossProfit)}</td>
        <td className="p-2 text-right">{renderEditableCell('platformProfit', data.platformProfit)}</td>
        <td className="p-2 text-right tabular-nums">
          {renderEditableCell('tiktokProfit', data.tiktokProfit, data.tiktokProfit < 0 ? "text-red-500" : "text-emerald-500")}
        </td>
        <td className="p-2 text-right font-bold text-blue-400">
          {isKol && isEditable ? (
             <Input 
               className="h-7 w-full text-right bg-white/10 border-white/20 text-blue-400 focus:bg-white/20 p-1 text-[11px] font-bold"
               value={data.lnCty === 0 ? '' : formatCurrency(data.lnCty)}
               onChange={(e) => updateKolCompanyProfit(dashboardSessionId as string, gender as any, parseCurrency(e.target.value))}
             />
          ) : (
             formatCurrency(data.lnCty || 0)
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <h1 className="text-xl lg:text-2xl font-black tracking-tight flex items-center gap-2">
          <Award className="text-yellow-500" />
          HIỆU SUẤT
        </h1>
        
        <div className="flex flex-wrap items-center gap-2 lg:gap-3 w-full lg:w-auto">
          <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
            <button 
              className={cn("flex-1 sm:flex-none px-3 lg:px-4 py-1.5 text-[10px] lg:text-sm font-bold rounded-md transition-all whitespace-nowrap", viewMode === 'general' ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-800")}
              onClick={() => setViewMode('general')}
            >
              CÁ NHÂN
            </button>
            <button 
              className={cn("flex-1 sm:flex-none px-3 lg:px-4 py-1.5 text-[10px] lg:text-sm font-bold rounded-md transition-all whitespace-nowrap", viewMode === 'gender' ? "bg-white shadow-sm text-pink-600" : "text-slate-500 hover:text-slate-800")}
              onClick={() => setViewMode('gender')}
            >
              NAM + NỮ
            </button>
          </div>

          <div className="relative flex items-center bg-white border rounded-lg shadow-sm flex-1 sm:flex-none min-w-[140px]">
            <Calendar size={14} className="ml-3 text-slate-400 absolute left-0" />
            <select 
              className="appearance-none bg-transparent w-full h-9 pl-9 pr-8 text-[11px] lg:text-sm font-bold text-slate-700 outline-none rounded-lg"
              value={dashboardSessionId}
              onChange={(e) => setDashboardSessionId(e.target.value)}
            >
              <option value="all">Tất cả tháng</option>
              <optgroup label="Chọn Tháng">
                {sessionOptions.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </optgroup>
            </select>
          </div>
          
          <Button onClick={exportExcel} size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto text-xs lg:text-sm h-9">
            <Download size={16} />
            <span className="sm:inline">Xuất Excel</span>
          </Button>
        </div>
      </div>

      {viewMode === 'general' ? (
        <div className="flex flex-col gap-6">
          {/* Top Cards: Phân tích nhóm & Host xuất sắc */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          <Card className="shadow-subtle border-none overflow-hidden">
            <CardHeader className="bg-slate-900 text-white py-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest">
                <TrendingUp size={16} />
                Xếp Hạng Host Theo Lợi Nhuận Công Ty
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs min-w-[900px]">
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
                    <th className="p-3 text-right font-bold text-blue-600">LN Công Ty ▾</th>
                    <th className="p-3 text-right bg-yellow-50 font-black text-slate-900">LN TK/ca</th>
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
                      <td className="p-3 text-right tabular-nums">{formatCurrency(s.ads)}</td>
                      <td className="p-3 text-right tabular-nums">{formatCurrency(s.cpHost)}</td>
                      <td className="p-3 text-right tabular-nums">{formatCurrency(s.lnSan)}</td>
                      <td className={cn("p-3 text-right font-bold tabular-nums", s.lnTikTok < 0 ? "text-red-500" : "text-emerald-600")}>
                        {formatCurrency(s.lnTikTok)}
                      </td>
                      <td className={cn("p-3 text-right font-bold tabular-nums", s.lnCty < 0 ? "text-red-500" : "text-emerald-600")}>
                        {formatCurrency(s.lnCty)}
                      </td>
                      <td className={cn("p-3 text-right font-bold tabular-nums", s.lnTkPerShift < 0 ? "text-red-500" : "text-emerald-600")}>
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
        </div>
      ) : (
        <div className="space-y-8">
          {/* WOMEN TABLE */}
          <Card className="shadow-subtle border-none overflow-hidden">
            <CardHeader className="bg-[#512c1b] text-white py-4 border-b border-amber-900">
              <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-[#f5c282]">
                <Users size={16} />
                WOMEN
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto bg-[#1b1b1b]">
              <table className="w-full border-collapse text-xs text-white">
                <thead className="bg-[#2a2a2a] text-[#c9b7aa] border-b border-[#3a3a3a]">
                  <tr>
                    <th className="p-3 text-left">HẠNG MỤC</th>
                    <th className="p-3 text-right">GMV</th>
                    <th className="p-3 text-right">CAST</th>
                    <th className="p-3 text-right">TRỢ</th>
                    <th className="p-3 text-right">ADS</th>
                    <th className="p-3 text-right">PHÍ SÀN</th>
                    <th className="p-3 text-right">LỢI NHUẬN GỘP</th>
                    <th className="p-3 text-right">LỢI NHUẬN SÀN</th>
                    <th className="p-3 text-right">LỢI NHUẬN TIKTOK</th>
                    <th className="p-3 text-right">LỢI NHUẬN CÔNG TY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3a3a3a]">
                  {renderGenderRow('LIVESTREAM', genderStats.womenStream)}
                  {renderGenderRow('Chị Vui', genderStats.womenKol, { isKol: true, gender: 'female' })}
                  {renderGenderRow('GMV MAX', genderStats.womenGmvMax, { isGmvMax: true, gender: 'female' })}
                  {renderGenderRow('TỔNG', genderStats.womenTotal, { isTotal: true })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* MEN TABLE */}
          <Card className="shadow-subtle border-none overflow-hidden mt-6">
            <CardHeader className="bg-[#512c1b] text-white py-4 border-b border-amber-900">
              <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-[#f5c282]">
                <Users size={16} />
                MEN
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto bg-[#1b1b1b]">
              <table className="w-full border-collapse text-xs text-white">
                <thead className="bg-[#2a2a2a] text-[#c9b7aa] border-b border-[#3a3a3a]">
                  <tr>
                    <th className="p-3 text-left">HẠNG MỤC</th>
                    <th className="p-3 text-right">GMV</th>
                    <th className="p-3 text-right">CAST</th>
                    <th className="p-3 text-right">TRỢ</th>
                    <th className="p-3 text-right">ADS</th>
                    <th className="p-3 text-right">PHÍ SÀN</th>
                    <th className="p-3 text-right">LỢI NHUẬN GỘP</th>
                    <th className="p-3 text-right">LỢI NHUẬN SÀN</th>
                    <th className="p-3 text-right">LỢI NHUẬN TIKTOK</th>
                    <th className="p-3 text-right">LỢI NHUẬN CÔNG TY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3a3a3a]">
                  {renderGenderRow('LIVESTREAM', genderStats.menStream)}
                  {renderGenderRow('GMV MAX', genderStats.menGmvMax, { isGmvMax: true, gender: 'male' })}
                  {renderGenderRow('TỔNG', genderStats.menTotal, { isTotal: true })}
                </tbody>
              </table>
            </div>
          </Card>

           {/* TOTAL TABLE */}
           <Card className="shadow-subtle border-none overflow-hidden mt-6">
            <div className="overflow-x-auto bg-[#1b1b1b]">
              <table className="w-full border-collapse text-xs text-white min-w-[1000px]">
                <thead className="bg-[#122c15] text-[#b3dbb8] border-b border-[#2d5232]">
                  <tr>
                    <th className="p-3 text-left">HẠNG MỤC</th>
                    <th className="p-3 text-right">GMV</th>
                    <th className="p-3 text-right">CAST</th>
                    <th className="p-3 text-right">TRỢ</th>
                    <th className="p-3 text-right">ADS</th>
                    <th className="p-3 text-right">PHÍ SÀN</th>
                    <th className="p-3 text-right">LỢI NHUẬN GỘP</th>
                    <th className="p-3 text-right">LỢI NHUẬN SÀN</th>
                    <th className="p-3 text-right">LỢI NHUẬN TIKTOK</th>
                    <th className="p-3 text-right">LỢI NHUẬN CÔNG TY</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-[#09150b] font-bold">
                    <td className="p-3 font-semibold w-40">TỔNG TIKTOKSHOP</td>
                    <td className="p-3 text-right">{formatCurrency(genderStats.totalAll.gmv)}</td>
                    <td className="p-3 text-right">{formatCurrency(genderStats.totalAll.cast)}</td>
                    <td className="p-3 text-right">{formatCurrency(genderStats.totalAll.tro)}</td>
                    <td className="p-3 text-right text-red-500">{formatCurrency(genderStats.totalAll.ads)}</td>
                    <td className="p-3 text-right">{formatCurrency(genderStats.totalAll.fees)}</td>
                    <td className="p-3 text-right">{formatCurrency(genderStats.totalAll.grossProfit)}</td>
                    <td className="p-3 text-right">{formatCurrency(genderStats.totalAll.platformProfit)}</td>
                    <td className={cn("p-3 text-right tabular-nums", genderStats.totalAll.tiktokProfit < 0 ? "text-red-500" : "text-emerald-500")}>
                      {formatCurrency(genderStats.totalAll.tiktokProfit)}
                    </td>
                    <td className="p-3 text-right text-blue-400">
                      {formatCurrency(genderStats.totalAll.lnCty)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

        </div>
      )}
    </div>
  );
}
