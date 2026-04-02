'use client';

import React from 'react';
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Download, Save, Share2, Menu } from "lucide-react";

interface TopBarProps {
  onMenuClick?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const { state } = useApp();
  const currentSession = state.sessions.find(s => s.id === state.currentSessionId);

  return (
    <div className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10 w-full">
      <div className="flex items-center gap-3 lg:gap-4 overflow-hidden">
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden shrink-0" 
          onClick={onMenuClick}
        >
          <Menu size={20} />
        </Button>
        <h2 className="font-bold text-base lg:text-lg truncate">{currentSession?.name || "Chọn phiên làm việc"}</h2>
        {currentSession && (
          <div className="flex items-center gap-2 px-3 py-1 bg-accent rounded-full text-xs font-medium text-accent-foreground">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Tháng {currentSession.month} / {currentSession.year}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopBar;
