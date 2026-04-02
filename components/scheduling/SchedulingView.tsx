'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useApp } from '@/lib/store';
import { SHIFTS, DAY_NAMES } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { ShieldCheck, AlertCircle, Trash2, User, Users, X } from 'lucide-react';
import { Host } from '@/types';
import { computeRankedHosts } from '@/lib/finance';

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
  const rankedHosts = React.useMemo(() => computeRankedHosts(hosts, state.sessions, 'all'), [hosts, state.sessions]);

  const [genderFilter, setGenderFilter] = useState<'female' | 'male'>('female');

  const [pendingSwap, setPendingSwap] = useState<(() => void) | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, day: number, shiftId: number } | null>(null);
  
  const [selectedHostId, setSelectedHostId] = useState<string | null>(null);
  const [pendingAssign, setPendingAssign] = useState<{day: number, shiftId: number, hostId: string} | null>(null);
  const [dontShowAssignAgain, setDontShowAssignAgain] = useState(false);

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
      const targetCell = destination.droppableId.replace('cell-', ''); 
      const [day, shift] = targetCell.split('-').map(Number);
      
      const realHostId = draggableId.split('-').pop() as string;

      const performSwap = () => {
         const sourceCell = source.droppableId.replace('cell-', '');
         const [sDay, sShift] = sourceCell.split('-').map(Number);
         const destHostId = currentSession.schedule[`${day}-${shift}-${genderFilter}`];
         
         updateSchedule(currentSession.id, sDay, sShift, genderFilter, destHostId || null);
         updateSchedule(currentSession.id, day, shift, genderFilter, realHostId);
      };

      const destHostId = currentSession.schedule[`${day}-${shift}-${genderFilter}`];
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

  const handleCellClick = (day: number, shiftId: number) => {
    if (!selectedHostId) return;
    
    // Nếu click vào ô đã có host giống hệt host đang chọn thì bỏ qua
    const currentOccupant = currentSession.schedule[`${day}-${shiftId}-${genderFilter}`];
    if (currentOccupant === selectedHostId) return;

    const hideWarning = localStorage.getItem('hide_assign_warning_until');
    if (hideWarning && parseInt(hideWarning) > Date.now()) {
      updateSchedule(currentSession.id, day, shiftId, genderFilter, selectedHostId);
    } else {
      setPendingAssign({ day, shiftId, hostId: selectedHostId });
    }
  };

  const handleConfirmAssign = () => {
    if (!pendingAssign) return;
    if (dontShowAssignAgain) {
      localStorage.setItem('hide_assign_warning_until', (Date.now() + 24 * 60 * 60 * 1000).toString());
    }
    updateSchedule(currentSession.id, pendingAssign.day, pendingAssign.shiftId, genderFilter, pendingAssign.hostId);
    setPendingAssign(null);
    setDontShowAssignAgain(false);
  };

  const handleCancelAssign = () => {
    setPendingAssign(null);
    setDontShowAssignAgain(false);
  };

  const removeHost = (day: number, shift: number) => {
    updateSchedule(currentSession.id, day, shift, genderFilter, null);
  };

  const getDayLabel = (day: number) => {
    const date = new Date(currentSession.year, currentSession.month - 1, day);
    const dayName = DAY_NAMES[date.getDay()];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    return { name: dayName, date: `${day}/${currentSession.month < 10 ? '0' : ''}${currentSession.month}`, isWeekend };
  };

  const hostsByGroup = (group: string) => rankedHosts.filter((h: any) => h.group === group && (genderFilter === 'male' ? h.gender === 'male' : h.gender !== 'male'));

  const getHostShiftCount = (hostId: string) => {
    return Object.values(currentSession.schedule).filter(id => id === hostId).length;
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex flex-col lg:h-full lg:overflow-hidden">
        <div className="px-4 lg:px-6 pt-4 flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex bg-slate-100 p-1 rounded-lg w-max shadow-sm border">
            <button 
              className={cn("px-4 lg:px-6 py-2 text-sm font-bold rounded-md transition-all flex items-center gap-2", genderFilter === 'female' ? "bg-white shadow-sm text-pink-600" : "text-slate-500 hover:text-slate-800")}
              onClick={() => setGenderFilter('female')}
            >
              <Users size={16} />
              <span className="hidden sm:inline">WOMEN</span>
              <span className="sm:hidden text-xs">NỮ</span>
            </button>
            <button 
              className={cn("px-4 lg:px-6 py-2 text-sm font-bold rounded-md transition-all flex items-center gap-2", genderFilter === 'male' ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-800")}
              onClick={() => setGenderFilter('male')}
            >
              <Users size={16} />
              <span className="hidden sm:inline">MEN</span>
              <span className="sm:hidden text-xs">NAM</span>
            </button>
          </div>
          
          {selectedHostId && (
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-[10px] lg:text-xs font-bold text-primary italic uppercase">
                Đang chọn: {rankedHosts.find(h => h.id === selectedHostId)?.name}
              </span>
              <button onClick={() => setSelectedHostId(null)} className="text-primary hover:bg-primary/20 p-0.5 rounded ml-1">
                <X size={12} />
              </button>
            </div>
          )}
        </div>

      <div className="flex flex-col lg:flex-row flex-1 p-4 lg:p-6 gap-4 lg:gap-6 lg:overflow-hidden min-h-0">
        {/* Left Side: Host List */}
        <div className={cn(
          "w-full lg:w-80 flex flex-col gap-4 lg:overflow-hidden shrink-0",
          selectedHostId ? "hidden lg:flex" : "flex"
        )}>
          <Card className="lg:flex-1 lg:overflow-hidden flex flex-col shadow-sm border-none bg-white/50 backdrop-blur-sm min-h-[400px] lg:min-h-0">
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
                  <div className="space-y-2">
                    {hostsByGroup(group).map((host) => (
                      <button
                        key={host.id}
                        onClick={() => setSelectedHostId(host.id === selectedHostId ? null : host.id)}
                        className={cn(
                          "w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all group",
                          selectedHostId === host.id 
                            ? "bg-primary/10 border-primary ring-2 ring-primary shadow-md" 
                            : "bg-white hover:border-primary/50"
                        )}
                        style={{
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
                        <ShieldCheck size={14} className={cn("transition-colors", selectedHostId === host.id ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-none shadow-none">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle size={18} className="text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-primary/80 leading-relaxed">
                <span className="font-bold">1. Phân ca:</span> Bấm chọn 1 Host ở danh sách bên trái, sau đó bấm vào ô trống trong lịch để điền.<br/>
                <span className="font-bold mt-1 block">2. Đổi ca:</span> Vẫn có thể kéo thả Host từ ca này sang ca khác để tráo vị trí như bình thường.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Grid Table */}
        <div className="flex-1 flex flex-col bg-card rounded-xl border shadow-subtle lg:overflow-hidden">
          <div className="flex-1 overflow-auto bg-slate-100/30 min-h-[500px] lg:min-h-0">
            <table className="w-full border-collapse table-fixed min-w-[1000px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-900 text-white">
                  <th className="w-16 lg:w-32 p-3 text-xs font-bold border-r border-slate-700 sticky left-0 z-[11] bg-slate-900">NGÀY</th>
                  {SHIFTS.map(shift => (
                    <th key={shift.id} className="p-3 text-[10px] lg:text-xs font-bold border-r border-slate-700 last:border-0 relative min-w-[120px] lg:min-w-[180px]">
                      <div className="flex flex-col items-center">
                        <span className="flex items-center gap-1">
                          {shift.name} 
                          {shift.isBest && <span className="text-yellow-400 text-sm lg:text-lg">★</span>}
                        </span>
                        <span className="text-[8px] lg:text-[10px] opacity-70 font-normal uppercase">{shift.time}</span>
                      </div>
                      {shift.isNight && <div className="absolute top-0 right-0 p-1 opacity-40 text-[10px]">🌙</div>}
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
                        <div className={cn("flex flex-col items-center justify-center p-0.5 lg:p-1 rounded-lg", info.isWeekend ? "text-red-600" : "text-slate-700")}>
                          <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-tighter">{info.name}</span>
                          <span className="text-sm lg:text-lg font-bold tabular-nums leading-none">{day}</span>
                        </div>
                      </td>
                      {SHIFTS.map(shift => {
                        const key = `${day}-${shift.id}-${genderFilter}`;
                        const hostId = currentSession.schedule[key];
                        const host = rankedHosts.find((h: any) => h.id === hostId);
                        
                        return (
                          <td key={shift.id} className="p-1 border-r last:border-0 align-top h-20 lg:h-24">
                            <Droppable droppableId={`cell-${day}-${shift.id}`}>
                              {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    onClick={() => handleCellClick(day, shift.id)}
                                    className={cn(
                                      "w-full h-full rounded-lg transition-all flex flex-col p-1 gap-1 cursor-pointer",
                                      snapshot.isDraggingOver ? "bg-primary/20 scale-[0.98] ring-2 ring-primary ring-inset" : "bg-transparent",
                                      (!host && selectedHostId) ? "hover:bg-primary/10 hover:border-primary hover:border-dashed border border-transparent" : "hover:bg-slate-50/80"
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
                                              onClick={(e) => {
                                                e.stopPropagation(); // Avoid triggering cell click when manually deleting
                                                removeHost(day, shift.id);
                                              }}
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
                Không nhắc lại cảnh báo đổi ca trong 24h
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

      {/* Assign Confirmation Modal */}
      {pendingAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full animate-in zoom-in-95">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <User className="text-primary" />
              Xác Nhận Phân Ca
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              Bạn có chắc chắn muốn thêm Host <span className="font-bold text-primary">{rankedHosts.find((h: any) => h.id === pendingAssign.hostId)?.name}</span> vào ca này?
              {currentSession.schedule[`${pendingAssign.day}-${pendingAssign.shiftId}-${genderFilter}`] && (
                <span className="block mt-2 text-red-500 font-medium">Lưu ý: Host cũ đang xếp ở ô này sẽ bị thay thế!</span>
              )}
            </p>
            <div className="flex items-center gap-2 mb-6">
              <input 
                type="checkbox" 
                id="dont-show-assign" 
                checked={dontShowAssignAgain}
                onChange={(e) => setDontShowAssignAgain(e.target.checked)}
                className="rounded border-slate-300"
              />
              <label htmlFor="dont-show-assign" className="text-xs text-slate-500 cursor-pointer">
                Không nhắc lại cảnh báo phân ca trong 24h
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={handleCancelAssign}
                className="px-4 py-2 text-sm font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                Hủy Bỏ
              </button>
              <button 
                onClick={handleConfirmAssign}
                className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg shadow-md hover:bg-primary/90 transition-colors"
              >
                Thêm Vào Ca
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
