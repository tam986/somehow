'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Host, HostGroup } from '@/types';
import { Plus, Edit2, Trash2, Award, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, calculateSessionFinance, computeRankedHosts } from '@/lib/finance';

export default function HostManagerView() {
  const { state, addHost, updateHost, deleteHost, updateSessionMeta } = useApp();
  const hosts = state.hosts;
  const currentSession = state.sessions.find(s => s.id === state.currentSessionId);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Host>>({});
  const [isAdding, setIsAdding] = useState(false);

  // Group and sort hosts dynamically based on all-time TikTok profit
  const rankedHosts = React.useMemo(() => computeRankedHosts(hosts, state.sessions, 'all'), [hosts, state.sessions]);

  const groupedHosts = {
    'A': rankedHosts.filter((h: any) => h.group === 'A'),
    'B': rankedHosts.filter((h: any) => h.group === 'B'),
    'C': rankedHosts.filter((h: any) => h.group === 'C'),
  };

  const handleEditClick = (host: Host) => {
    setEditingId(host.id);
    setEditForm(host);
  };

  const handleSaveEdit = () => {
    if (editingId && editForm.name) {
      updateHost(editingId, editForm);
      setEditingId(null);
      setEditForm({});
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setIsAdding(false);
  };

  const handleAddNewClick = () => {
    setIsAdding(true);
    setEditingId('new');
    setEditForm({
      name: '',
      phone: '',
      gender: 'female',
      group: 'C',
      color: '#757575',
      bgColor: '#E0E0E0',
      note: ''
    });
  };

  const handleSaveNew = () => {
    if (editForm.name && editForm.group && editForm.color && editForm.bgColor) {
      addHost(editForm as Omit<Host, 'id'>);
      setIsAdding(false);
      setEditingId(null);
      setEditForm({});
    } else {
      alert("Vui lòng điền đủ Tên, Nhóm và Màu sắc!");
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Bạn có chắc muốn xóa Host: ${name}?`)) {
      deleteHost(id);
    }
  };

  const renderHostRow = (hostParam: any, isNew = false) => {
    // If it's a new host being added, use formState. Otherwise, use the dynamically ranked host properties (like computed group).
    const isEditing = editingId === hostParam.id;
    const formState = isEditing ? editForm : hostParam;
    const host = hostParam;
    
    // Tổng LN TikTok trong tháng hiện tại (chỉ để hiển thị cột currentIncome như cũ)
    let currentIncome = 0;
    if (currentSession) {
      Object.entries(currentSession.schedule).forEach(([key, hId]) => {
        if (hId === host.id && currentSession.financials[key]) {
          const supportSalary = currentSession.supportSalary || 0;
          const totalSessionsAll = (currentSession.totalSessionsFemale || 0) + (currentSession.totalSessionsMale || 0);
          const supportPerShift = totalSessionsAll > 0 ? supportSalary / totalSessionsAll : 0;
          
          const res = calculateSessionFinance(currentSession.financials[key], 0, supportPerShift);
          currentIncome += res.tiktokProfit;
        }
      });
    }

    return (
      <tr key={isNew ? 'new' : host.id} className="border-b hover:bg-slate-50 transition-colors">
        <td className="p-3">
          {isEditing ? (
            <Input 
              value={formState.name} 
              onChange={e => setEditForm({...formState, name: e.target.value})}
              placeholder="Tên Host"
              className="h-8"
            />
          ) : (
            <span className="font-bold">{host.name}</span>
          )}
        </td>
        <td className="p-3">
          {isEditing ? (
            <Input 
              value={formState.phone || ''} 
              onChange={e => setEditForm({...formState, phone: e.target.value})}
              placeholder="Số điện thoại"
              className="h-8"
            />
          ) : (
            <span className="text-sm text-slate-600">{host.phone || "---"}</span>
          )}
        </td>
        <td className="p-3">
          {isEditing ? (
             <select 
              value={formState.gender || 'female'}
              onChange={e => setEditForm({...formState, gender: e.target.value as 'male' | 'female'})}
              className="h-8 rounded-md border border-input text-sm px-2 w-full"
            >
              <option value="female">Nữ</option>
              <option value="male">Nam</option>
            </select>
          ) : (
             <span className="text-sm font-semibold">{host.gender === 'male' ? 'Nam' : 'Nữ'}</span>
          )}
        </td>
        <td className="p-3">
          {isNew ? (
            <select 
              value={formState.group}
              onChange={e => setEditForm({...formState, group: e.target.value as HostGroup})}
              className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="A">A (Tạm)</option>
              <option value="B">B (Tạm)</option>
              <option value="C">C (Tạm)</option>
            </select>
          ) : (
            <span className={cn(
              "px-2 py-1 rounded-full text-xs font-bold",
              host.group === 'A' ? "bg-green-100 text-green-700" :
              host.group === 'B' ? "bg-blue-100 text-blue-700" :
              "bg-slate-100 text-slate-700"
            )}>
              Nhóm {host.group}
            </span>
          )}
          {!isNew && <span className="text-[10px] text-slate-400 ml-2 italic">Tự động xép hạng</span>}
        </td>
        <td className="p-3">
          {isEditing ? (
            <div className="flex gap-2 items-center">
              <input 
                type="color" 
                value={formState.color || '#000000'}
                onChange={e => setEditForm({...formState, color: e.target.value})}
                className="w-8 h-8 rounded shrink-0"
              />
              <span className="text-xs">Viền/Text</span>
              <input 
                type="color" 
                value={formState.bgColor || '#ffffff'}
                onChange={e => setEditForm({...formState, bgColor: e.target.value})}
                className="w-8 h-8 rounded shrink-0 ml-2"
              />
              <span className="text-xs">Nền</span>
            </div>
          ) : (
             <div className="flex items-center gap-2">
              <div 
                className="w-6 h-6 rounded-md border" 
                style={{ backgroundColor: host.bgColor, borderColor: host.color }} 
              />
            </div>
          )}
        </td>
        <td className="p-3">
          {(!isEditing && !isNew && currentSession) ? (
            <div className={cn("text-xs font-bold", currentIncome < 0 ? "text-red-500" : currentIncome > 0 ? "text-emerald-600" : "text-slate-600")}>
              {formatCurrency(currentIncome)}
            </div>
          ) : (isEditing && !isNew) ? (
            <div className="flex justify-end gap-2 pr-6">
               <span className={cn("text-xs font-bold", currentIncome < 0 ? "text-red-500" : currentIncome > 0 ? "text-emerald-600" : "text-slate-600")}>
                {formatCurrency(currentIncome)}
              </span>
            </div>
          ) : null}
        </td>
        <td className="p-3 text-right">
          {isEditing ? (
            <div className="flex justify-end gap-2">
              <Button size="sm" onClick={isNew ? handleSaveNew : handleSaveEdit} className="h-8 bg-emerald-600 hover:bg-emerald-700">
                <Save size={14} className="mr-1" /> Lưu
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-8">
                <X size={14} />
              </Button>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleEditClick(host)}>
                <Edit2 size={14} className="text-blue-600" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleDelete(host.id, host.name)}>
                <Trash2 size={14} className="text-red-500" />
              </Button>
            </div>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border shadow-sm gap-4">
        <div>
          <h2 className="text-lg lg:text-xl font-bold flex items-center gap-2">
            Quản Lý Host
          </h2>
          <p className="text-xs text-slate-500">Quản lý danh sách và phân nhóm</p>
        </div>
        <Button onClick={handleAddNewClick} disabled={isAdding} size="sm" className="w-full sm:w-auto h-9">
          <Plus size={16} className="mr-2" />
          Thêm Host
        </Button>
      </div>

      <Card className="border-none shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm min-w-[800px]">
            <thead>
              <tr className="bg-slate-900 text-white uppercase text-xs tracking-wider">
                <th className="p-3 text-left">Tên Host</th>
                <th className="p-3 text-left">Số Điện Thoại</th>
                <th className="p-3 text-left">Giới Tính</th>
                <th className="p-3 text-left">Nhóm</th>
                <th className="p-3 text-left">Màu Sắc</th>
                <th className="p-3 text-left">Lợi Nhuận Tiktok (Tháng)</th>
                <th className="p-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {isAdding && renderHostRow({
                id: 'new', name: '', phone: '', gender: 'female', group: 'C', color: '#757575', bgColor: '#E0E0E0'
              }, true)}
              
              {/* Group A */}
              {groupedHosts['A'].length > 0 && (
                <tr className="bg-green-50/50">
                  <td colSpan={7} className="p-2 text-xs font-bold text-green-800 uppercase tracking-widest pl-4 border-b">Nhóm A (Top Doanh Thu)</td>
                </tr>
              )}
              {groupedHosts['A'].map(h => renderHostRow(h))}

              {/* Group B */}
              {groupedHosts['B'].length > 0 && (
                <tr className="bg-blue-50/50">
                  <td colSpan={7} className="p-2 text-xs font-bold text-blue-800 uppercase tracking-widest pl-4 border-b">Nhóm B</td>
                </tr>
              )}
              {groupedHosts['B'].map(h => renderHostRow(h))}

              {/* Group C */}
              {groupedHosts['C'].length > 0 && (
                <tr className="bg-slate-100">
                  <td colSpan={7} className="p-2 text-xs font-bold text-slate-700 uppercase tracking-widest pl-4 border-b">Nhóm C</td>
                </tr>
              )}
              {groupedHosts['C'].map(h => renderHostRow(h))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
