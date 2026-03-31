'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useApp } from '@/lib/store';
import { SHIFTS, DAY_NAMES } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { User, ShieldCheck, AlertCircle, Trash2 } from 'lucide-react';
import { Host } from '@/types';

// Simple Badge component since I didn't make one
const BadgeLocal = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", className)}>
    {children}
  </span>
);

export default function SchedulingView() {
  const { state, updateSchedule } = useApp();
  const currentSession = state.sessions.find(s => s.id === state.currentSessionId);
  const hosts = state.hosts;

  const [pendingSwap, setPendingSwap] = useState<(() => void) | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, day: number, shiftId: number } | null>(null);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  if (!currentSession) return null;

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    if (destination.droppableId.startsWith('cell-')) {
      const targetCell = destination.droppableId.replace('cell-', ''); // "day-shiftIndex"
      const [day, shift] = targetCell.split('-').map(Number);
      
      const realHostId = draggableId.split('-').pop() as string;

      const performSwap = () => {
        if (source.droppableId.startsWith('cell-')) {
           const sourceCell = source.droppableId.replace('cell-', '');
           const [sDay, sShift] = sourceCell.split('-').map(Number);
           const destHostId = currentSession.schedule[`${day}-${shift}`];
           
           updateSchedule(currentSession.id, sDay, sShift, destHostId || null);
           updateSchedule(currentSession.id, day, shift, realHostId);
        } else {
           updateSchedule(currentSession.id, day, shift, realHostId);
        }
      };

      if (source.droppableId.startsWith('cell-')) {
         const destHostId = currentSession.schedule[`${day}-${shift}`];
         if (destHostId && destHostId !== realHostId) {
            const hideWarning = localStorage.getItem('hide_swap_warning_until');
            if (hideWarning && parseInt(hideWarning) > Date.now()) {
                performSwap();
            } else {
                setPendingSwap(() => performSwap);
            }
         } else {
            performSwap();
         }
      } else {
         performSwap();
      }
    }
  };

  const handleConfirmSwap = () => {
    if (dontShowAgain) {
      localStorage.setItem('hide_swap_warning_until', (Date.now() + 24 * 60 * 60 * 1000).toString());
    }
    if (pendingSwap) pendingSwap();
    setPendingSwap(null);
    setDontShowAgain(false);
  };

  const handleCancelSwap = () => {
    setPendingSwap(null);
    setDontShowAgain(false);
  };

  const removeHost = (day: number, shift: number) => {
    updateSchedule(currentSession.id, day, shift, null);
  };

  const getDayLabel = (day: number) => {
    const date = new Date(currentSession.year, currentSession.month - 1, day);
    const dayName = DAY_NAMES[date.getDay()];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    return { name: dayName, date: `${day}/${currentSession.month < 10 ? '0' : ''}${currentSession.month}`, isWeekend };
  };

  const hostsByGroup = (group: string) => hosts.filter(h => h.group === group);

  const getHostShiftCount = (hostId: string) => {
    return Object.values(currentSession.schedule).filter(id => id === hostId).length;
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex flex-1 p-6 gap-6 overflow-hidden h-full">
        {/* Left Side: Host List */}
        <div className="w-80 flex flex-col gap-4">
          <Card className="flex-1 overflow-hidden flex flex-col shadow-sm border-none bg-white/50 backdrop-blur-sm">
            <CardHeader className="py-4 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <User size={18} className="text-primary" />
                DANH SÁCH HOST
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-6">
              {['A', 'B', 'C'].map(group => (
                <div key={group}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                      Nhóm {group}
                      <span className="w-4 h-4 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-normal">
                        {hostsByGroup(group).length}
                      </span>
                    </h3>
                  </div>
                  <Droppable droppableId={`list-${group}`} isDropDisabled={true}>
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                        {hostsByGroup(group).map((host, index) => (
                          <Draggable key={host.id} draggableId={host.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  "p-3 rounded-xl border flex items-center justify-between transition-all group",
                                  snapshot.isDragging ? "shadow-2xl scale-105 z-50 ring-2 ring-primary border-transparent" : "bg-white hover:border-primary/50"
                                )}
                                style={{
                                  ...provided.draggableProps.style,
                                  borderLeft: `4px solid ${host.color}`
                                }}
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold">{host.name}</span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                                      Ca: <span className="font-bold text-primary">{getHostShiftCount(host.id)}</span>
                                    </span>
                                    {host.note && (
                                      <span className="text-[10px] text-muted-foreground italic truncate max-w-[100px]">
                                        - {host.note}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <ShieldCheck size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-none shadow-none">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle size={18} className="text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-primary/80 leading-relaxed">
                Kéo Host vào bảng lịch để phân ca. Bạn cũng có thể kéo Host từ ca này sang ca khác để đổi vị trí.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Grid Table */}
        <div className="flex-1 flex flex-col bg-card rounded-xl border shadow-subtle overflow-hidden">
          <div className="flex-1 overflow-auto bg-slate-100/30">
            <table className="w-full border-collapse table-fixed min-w-[1000px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-900 text-white">
                  <th className="w-32 p-3 text-xs font-bold border-r border-slate-700">NGÀY</th>
                  {SHIFTS.map(shift => (
                    <th key={shift.id} className="p-3 text-xs font-bold border-r border-slate-700 last:border-0 relative">
                      <div className="flex flex-col items-center">
                        <span className="flex items-center gap-1">
                          {shift.name} 
                          {shift.isBest && <span className="text-yellow-400 text-lg">★</span>}
                        </span>
                        <span className="text-[10px] opacity-70 font-normal uppercase">{shift.time}</span>
                      </div>
                      {shift.isNight && <div className="absolute top-0 right-0 p-1 opacity-40">🌙</div>}
                    </th>
                   ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: currentSession.days }, (_, i) => i + 1).map(day => {
                  const info = getDayLabel(day);
                  return (
                    <tr key={day} className={cn("border-b", info.isWeekend ? "bg-slate-50" : "bg-white")}>
                      <td className="p-2 border-r text-center align-middle sticky left-0 z-[5] bg-inherit border-b">
                        <div className={cn("flex flex-col items-center justify-center p-1 rounded-lg", info.isWeekend ? "text-red-600" : "text-slate-700")}>
                          <span className="text-[10px] font-black uppercase tracking-tighter">{info.name}</span>
                          <span className="text-lg font-bold tabular-nums leading-none">{day}</span>
                          <span className="text-[8px] opacity-60 font-bold">{info.date}</span>
                        </div>
                      </td>
                      {SHIFTS.map(shift => {
                        const key = `${day}-${shift.id}`;
                        const hostId = currentSession.schedule[key];
                        const host = hosts.find(h => h.id === hostId);
                        
                        return (
                          <td key={shift.id} className="p-1 border-r last:border-0 align-top h-24">
                            <Droppable droppableId={`cell-${day}-${shift.id}`}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={cn(
                                    "w-full h-full rounded-lg transition-all flex flex-col p-1 gap-1",
                                    snapshot.isDraggingOver ? "bg-primary/20 scale-[0.98] ring-2 ring-primary ring-inset" : "bg-transparent hover:bg-slate-50/80"
                                  )}
                                >
                                  {host ? (
                                    <Draggable draggableId={`cell-${day}-${shift.id}-${host.id}`} index={0}>
                                      {(dragProvided, dragSnapshot) => (
                                        <div 
                                          ref={dragProvided.innerRef}
                                          {...dragProvided.draggableProps}
                                          {...dragProvided.dragHandleProps}
                                          className={cn(
                                            "w-full h-full rounded-md shadow-sm border flex flex-col p-2 relative group-cell animate-in fade-in zoom-in duration-200",
                                            dragSnapshot.isDragging && "z-50 shadow-2xl scale-105"
                                          )}
                                          style={{ ...dragProvided.draggableProps.style, backgroundColor: host.bgColor, borderLeft: `4px solid ${host.color}` }}
                                          onContextMenu={(e) => {
                                            e.preventDefault();
                                            setContextMenu({ x: e.clientX, y: e.clientY, day, shiftId: shift.id });
                                          }}
                                        >
                                          <div className="flex justify-between items-start gap-1">
                                            <span className="text-[10px] font-bold leading-tight" style={{ color: host.color }}>
                                              {host.name}
                                            </span>
                                            <button 
                                              onClick={() => removeHost(day, shift.id)}
                                              className="text-[10px] opacity-0 group-cell-hover:opacity-100 hover:text-red-500 transition-opacity"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                          <div className="mt-auto flex justify-between items-end">
                                            <BadgeLocal className={cn(
                                              "text-[8px] px-1",
                                              host.group === 'A' ? "bg-green-100 text-green-700 border border-green-200" :
                                              host.group === 'B' ? "bg-blue-100 text-blue-700 border border-blue-200" : 
                                              "bg-slate-100 text-slate-700 border border-slate-200"
                                            )}>
                                              Hạng {host.group}
                                            </BadgeLocal>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  ) : (
                                    <div className="w-full h-full border border-dashed border-slate-200 rounded-md flex items-center justify-center text-[10px] text-slate-300 uppercase font-bold tracking-widest">
                                      Trống
                                    </div>
                                  )}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Swap Confirmation Modal */}
      {pendingSwap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full animate-in zoom-in-95">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <AlertCircle className="text-orange-500" />
              Xác Nhận Đổi Ca
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              Bạn đang kéo thả để đổi (swap) vị trí của hai Host. Bạn có chắc chắn muốn thực hiện thao tác này?
            </p>
            <div className="flex items-center gap-2 mb-6">
              <input 
                type="checkbox" 
                id="dont-show" 
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="rounded border-slate-300"
              />
              <label htmlFor="dont-show" className="text-xs text-slate-500 cursor-pointer">
                Không nhắc lại cảnh báo này trong hôm nay (24h)
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={handleCancelSwap}
                className="px-4 py-2 text-sm font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                Hủy Bỏ
              </button>
              <button 
                onClick={handleConfirmSwap}
                className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg shadow-md hover:bg-primary/90 transition-colors"
              >
                Chấp Nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right Click Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-[100] bg-white border shadow-lg rounded-md overflow-hidden animate-in fade-in zoom-in-95"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button 
            className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left font-bold flex items-center gap-2 transition-colors min-w-[150px]"
            onClick={(e) => {
              e.stopPropagation();
              removeHost(contextMenu.day, contextMenu.shiftId);
              setContextMenu(null);
            }}
          >
            <Trash2 size={14} />
            Hủy Ca Này
          </button>
        </div>
      )}

      {/* Dynamic Style for group-cell stuff */}
      <style jsx global>{`
        .group-cell:hover .group-cell-hover\\:opacity-100 {
          opacity: 1;
        }
      `}</style>
    </DragDropContext>
  );
}
