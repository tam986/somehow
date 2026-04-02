'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import SchedulingView from '@/components/scheduling/SchedulingView';
import DataEntryView from '@/components/data-entry/DataEntryView';
import KolDataEntryView from '@/components/data-entry/KolDataEntryView';
import DashboardView from '@/components/dashboard/DashboardView';
import ConfigurationView from '@/components/config/ConfigurationView';
import HostManagerView from '@/components/hosts/HostManagerView';
import { useApp } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('schedule');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { state, addSession } = useApp();
  
  // Create an initial session if none exists
  useEffect(() => {
    if (state.sessions.length === 0) {
      addSession("Tháng 3 - 2026", 3, 2026);
    }
  }, [state.sessions.length, addSession]);

  const renderContent = () => {
    if (state.sessions.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-accent/30">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6">
            <Plus size={32} />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Chưa có phiên làm việc nào!</h2>
          <p className="text-muted-foreground mb-8 max-w-sm">
            Bắt đầu bằng cách tạo một phiên làm việc mới (tháng/năm) để quản lý lịch trình và doanh thu.
          </p>
          <Button onClick={() => addSession("Tháng 3 - 2026", 3, 2026)} size="lg">
            Khởi tạo phiên đầu tiên
          </Button>
        </div>
      );
    }

    switch (activeTab) {
      case 'schedule': return <SchedulingView />;
      case 'data': return <DataEntryView />;
      case 'kol': return <KolDataEntryView />;
      case 'analysis': return <DashboardView />;
      case 'hosts': return <HostManagerView />;
      case 'config': return <ConfigurationView />;
      default: return <SchedulingView />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-full">
        <TopBar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
