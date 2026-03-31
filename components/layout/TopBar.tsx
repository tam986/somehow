'use client';

import React from 'react';
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Download, Save, Share2 } from "lucide-react";

const TopBar: React.FC = () => {
  const { state } = useApp();
  const currentSession = state.sessions.find(s => s.id === state.currentSessionId);

  return (
    <div className="h-16 border-b bg-card flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <h2 className="font-semibold text-lg">{currentSession?.name || "Chọn phiên làm việc"}</h2>
        {currentSession && (
          <div className="flex items-center gap-2 px-3 py-1 bg-accent rounded-full text-xs font-medium text-accent-foreground">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Tháng {currentSession.month} / {currentSession.year}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 size={16} />
          <span>Chia sẻ</span>
        </Button>
        <Button variant="outline" size="sm" className="gap-2">
          <Download size={16} />
          <span>Xuất Excel</span>
        </Button>
        <Button size="sm" className="gap-2 shadow-sm">
          <Save size={16} />
          <span>Lưu thay đổi</span>
        </Button>
      </div>
    </div>
  );
};

export default TopBar;
