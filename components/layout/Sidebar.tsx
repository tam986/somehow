'use client';

import React, { useState } from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Calendar, LayoutDashboard, Database, Settings, LogOut, Plus, Users, X, Star } from "lucide-react";
import { useApp } from "@/lib/store";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { state, addSession, resetAll, setCurrentSession } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  const [newSessionName, setNewSessionName] = useState(`Tháng ${currentMonth} - ${currentYear}`);
  const [newSessionMonth, setNewSessionMonth] = useState(currentMonth);
  const [newSessionYear, setNewSessionYear] = useState(currentYear);

  const menuItems = [
    { id: 'schedule', label: 'Xếp Lịch', icon: Calendar },
    { id: 'data', label: 'Nhập Data', icon: Database },
    { id: 'kol', label: 'Nhập Liệu KOL', icon: Star },
    { id: 'hosts', label: 'Quản Lý Host', icon: Users },
    { id: 'analysis', label: 'Tổng Hợp', icon: LayoutDashboard },
    { id: 'config', label: 'Cấu Hình', icon: Settings },
  ];

  const submitAddSession = () => {
    if (newSessionName.trim() === '') return;
    addSession(newSessionName, newSessionMonth, newSessionYear);
    setShowAddModal(false);
  };

  return (
    <div className="w-64 border-r bg-card flex flex-col h-full">
      <div className="p-6 border-b flex items-center gap-2">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold italic">S</div>
        <span className="font-bold text-xl tracking-tight">SOMEHOW</span>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200">
        <p className="text-xs font-semibold text-muted-foreground uppercase px-2 py-1 mt-2">Menu</p>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all",
              activeTab === item.id 
                ? "bg-primary text-primary-foreground shadow-md" 
                : "hover:bg-accent text-muted-foreground hover:text-accent-foreground"
            )}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}

        <div className="pt-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase px-2 py-1">Phiên làm việc</p>
          <div className="space-y-1 mt-1">
            {[...state.sessions]
              .sort((a, b) => b.year === a.year ? b.month - a.month : b.year - a.year)
              .map(session => (
              <Button
                key={session.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start font-normal text-sm",
                  state.currentSessionId === session.id ? "bg-primary text-primary-foreground font-bold shadow-sm" : "text-muted-foreground hover:bg-slate-100"
                )}
                size="sm"
                onClick={() => setCurrentSession(session.id)}
              >
                {session.name}
              </Button>
            ))}
            <Button 
              variant="outline" 
              className="w-full justify-start mt-2 border-dashed" 
              size="sm"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={16} className="mr-2" />
              Thêm tháng mới
            </Button>
          </div>
        </div>
      </nav>

      <div className="p-4 border-t space-y-2">
        <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/10" onClick={resetAll}>
          <LogOut size={20} className="mr-2" />
          Xóa dữ liệu
        </Button>
        <div className="text-[10px] text-center text-muted-foreground">Host Women 2026 Admin</div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-xs w-full animate-in zoom-in-95">
            <h3 className="text-lg font-bold mb-4 flex items-center justify-between">
              Tạo phiên mới
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700"><X size={18}/></button>
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tên hiển thị</label>
                <input 
                  type="text" 
                  value={newSessionName}
                  onChange={e => setNewSessionName(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border text-sm"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tháng (1-12)</label>
                  <input 
                    type="number" 
                    min="1" max="12"
                    value={newSessionMonth}
                    onChange={e => {
                      const m = parseInt(e.target.value) || 1;
                      setNewSessionMonth(m);
                      setNewSessionName(`Tháng ${m} - ${newSessionYear}`);
                    }}
                    className="w-full h-9 px-3 rounded-md border text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Năm</label>
                  <input 
                    type="number" 
                    value={newSessionYear}
                    onChange={e => {
                      const y = parseInt(e.target.value) || 2026;
                      setNewSessionYear(y);
                      setNewSessionName(`Tháng ${newSessionMonth} - ${y}`);
                    }}
                    className="w-full h-9 px-3 rounded-md border text-sm"
                  />
                </div>
              </div>
            </div>

            <Button onClick={submitAddSession} className="w-full font-bold">
              Tạo Phiên Làm Việc
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
