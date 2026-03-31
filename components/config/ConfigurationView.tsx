'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, Trash2, Edit2, Users, Calendar, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ConfigurationView() {
  const { state, addSession, resetAll } = useApp();
  const [newHostName, setNewHostName] = useState('');

  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const name = fd.get('name') as string;
    const month = parseInt(fd.get('month') as string);
    const year = parseInt(fd.get('year') as string);
    
    if (name && month && year) {
      addSession(name, month, year);
      (e.target as HTMLFormElement).reset();
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight">CÀI ĐẶT HỆ THỐNG</h1>
        <Button variant="destructive" size="sm" onClick={resetAll}>Reset Toàn Bộ Ứng Dụng</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Session Management */}
        <Card className="shadow-subtle border-none">
          <CardHeader className="border-b">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Calendar className="text-primary" />
              Quản Lý Phiên Làm Việc
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <form onSubmit={handleAddSession} className="space-y-4 p-4 bg-accent/30 rounded-xl border border-accent">
              <p className="text-xs font-bold uppercase text-muted-foreground">Thêm phiên mới</p>
              <div className="space-y-3">
                <Input name="name" placeholder="Tên phiên (VD: Tháng 4 - 2026)" required />
                <div className="grid grid-cols-2 gap-2">
                  <Input name="month" type="number" min="1" max="12" placeholder="Tháng (1-12)" required />
                  <Input name="year" type="number" min="2025" placeholder="Năm (2026)" required />
                </div>
                <Button type="submit" className="w-full">Khởi tạo tháng làm việc</Button>
              </div>
            </form>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase text-muted-foreground px-1">Danh sách phiên</p>
              {state.sessions.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:border-primary/50 transition-colors">
                  <div>
                    <p className="font-bold text-sm">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground">T{s.month}/{s.year} • {s.days} ngày</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Edit2 size={14} /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 size={14} /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Host Management */}
        <Card className="shadow-subtle border-none">
          <CardHeader className="border-b">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="text-primary" />
              Quản Lý Danh Sách Host
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
             <div className="flex gap-2">
                <Input 
                  placeholder="Tên Host mới..." 
                  value={newHostName} 
                  onChange={(e) => setNewHostName(e.target.value)}
                />
                <Button size="icon" className="shrink-0"><Plus size={18} /></Button>
             </div>

             <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
               {state.hosts.map(host => (
                 <div key={host.id} className="flex items-center gap-3 p-3 bg-white border rounded-lg">
                    <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-white font-bold" style={{ backgroundColor: host.color }}>
                      {host.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{host.name}</p>
                      <div className="flex items-center gap-2">
                         <BadgeLocal group={host.group}>{host.group}</BadgeLocal>
                         <span className="text-[10px] text-muted-foreground">{host.note || "Không có ghi chú"}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Palette size={14} /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 size={14} /></Button>
                    </div>
                 </div>
               ))}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const BadgeLocal = ({ children, group }: any) => (
  <span className={cn(
    "px-1.5 py-0.5 rounded text-[8px] font-black uppercase",
    group === 'A' ? "bg-green-100 text-green-700" :
    group === 'B' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
  )}>
    Nhóm {children}
  </span>
);
