'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState, Host, MonthSession, Schedule, FinancialRecord, KolFinancialRecord } from '@/types';
import { INITIAL_HOSTS } from './constants';
import { syncStateToFirebase, loadStateFromFirebase, default as firebaseApp } from './firebase';

interface AppContextType {
  state: AppState;
  addSession: (name: string, month: number, year: number) => void;
  updateSessionMeta: (sessionId: string, capital: number, totalSessions: number, gender: 'female' | 'male') => void;
  updateSchedule: (sessionId: string, day: number, shift: number, gender: 'female' | 'male', hostId: string | null) => void;
  updateFinancials: (sessionId: string, day: number, shift: number, gender: 'female' | 'male', field: keyof FinancialRecord, value: number) => void;
  updateSupportSalary: (sessionId: string, value: number) => void;
  setCurrentSession: (id: string) => void;
  setLockedHosts: (sessionId: string, hostIds: string[]) => void;
  resetAll: () => void;
  addHost: (host: Omit<Host, 'id'>) => void;
  updateHost: (id: string, host: Partial<Host>) => void;
  deleteHost: (id: string) => void;
  saveKolFinancial: (sessionId: string, record: KolFinancialRecord) => void;
  deleteKolFinancial: (sessionId: string, recordId: string) => void;
  updateGmvMax: (sessionId: string, gender: 'female' | 'male', field: keyof FinancialRecord, value: number) => void;
  updateKolCompanyProfit: (sessionId: string, gender: 'female' | 'male', value: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'host-women-app-state';

// Helper: Firebase silently deletes empty objects. We must restore them.
const sanitizeState = (rawState: any): AppState => {
  if (!rawState) return rawState;
  
  const sessions = (rawState.sessions || []).map((s: any) => {
    const rawSchedule = s.schedule || {};
    const rawFinancials = s.financials || {};
    
    // Migrate old keys without gender suffix
    const migratedSchedule: any = {};
    const migratedFinancials: any = {};
    
    Object.keys(rawSchedule).forEach(key => {
      // old format was "day-shift" (e.g. "1-2"). New format: "1-2-female" or "1-2-male"
      if (key.split('-').length === 2 && rawSchedule[key]) {
         const hostId = rawSchedule[key];
         const host = (rawState.hosts || []).find((h: any) => h.id === hostId);
         const gender = host?.gender === 'male' ? 'male' : 'female';
         migratedSchedule[`${key}-${gender}`] = hostId;
         if (rawFinancials[key]) {
             migratedFinancials[`${key}-${gender}`] = rawFinancials[key];
         }
      } else {
         migratedSchedule[key] = rawSchedule[key];
      }
    });

    Object.keys(rawFinancials).forEach(key => {
      if (key.split('-').length === 2 && !migratedFinancials[`${key}-female`] && !migratedFinancials[`${key}-male`]) {
         const hostId = rawSchedule[key];
         const host = (rawState.hosts || []).find((h: any) => h.id === hostId);
         const gender = host?.gender === 'male' ? 'male' : 'female';
         migratedFinancials[`${key}-${gender}`] = rawFinancials[key];
      } else if (key.split('-').length > 2) {
         migratedFinancials[key] = rawFinancials[key];
      }
    });

    return {
      ...s,
      schedule: migratedSchedule,
      financials: migratedFinancials,
      kolFinancials: s.kolFinancials || [],
      lockedHosts: s.lockedHosts || [],
      capital: s.capital || 15480000,
      capitalFemale: s.capitalFemale || s.capital || 15480000,
      capitalMale: s.capitalMale || s.capital || 15480000,
      totalSessions: s.totalSessions || 129,
      totalSessionsFemale: s.totalSessionsFemale || s.totalSessions || 129,
      totalSessionsMale: s.totalSessionsMale || s.totalSessions || 129,
      supportSalary: s.supportSalary || 0,
      gmvMaxWomen: s.gmvMaxWomen || { gmv: 0, ads: 0, cast: 0, tro: 0, ot: 0, fees: 0, grossProfit: 0, platformProfit: 0, tiktokProfit: 0, companyProfit: 0 },
      gmvMaxMen: s.gmvMaxMen || { gmv: 0, ads: 0, cast: 0, tro: 0, ot: 0, fees: 0, grossProfit: 0, platformProfit: 0, tiktokProfit: 0, companyProfit: 0 },
      kolCompanyProfitWomen: s.kolCompanyProfitWomen || 0,
      kolCompanyProfitMen: s.kolCompanyProfitMen || 0
    };
  });

  return {
    ...rawState,
    hosts: rawState.hosts || [],
    sessions
  };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({
    hosts: INITIAL_HOSTS,
    sessions: [],
    currentSessionId: null,
  });

  const [isLoaded, setIsLoaded] = useState(false);

  // Load from LocalStorage or Firebase
  useEffect(() => {
    if (firebaseApp.isConfigured) {
      const unsubscribe = loadStateFromFirebase((firebaseState) => {
        // Only load if valid 
        if (firebaseState && Array.isArray(firebaseState.sessions)) {
          setState(sanitizeState(firebaseState));
        } else {
          // Fallback to local storage if Firebase is completely empty (Migration step)
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (parsed && Array.isArray(parsed.sessions)) {
                setState(sanitizeState(parsed));
              }
            } catch (e) {
              console.error("Failed to load local state", e);
            }
          }
        }
        setIsLoaded(true);
      });
      return () => unsubscribe();
    } else {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setState(sanitizeState(parsed));
        } catch (e) {
          console.error("Failed to load state", e);
        }
      }
      setIsLoaded(true);
    }
  }, []);

  // Sync to LocalStorage or Firebase
  useEffect(() => {
    if (isLoaded) {
      if (firebaseApp.isConfigured) {
        syncStateToFirebase(state);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    }
  }, [state, isLoaded]);

  const addSession = (name: string, month: number, year: number) => {
    const id = Date.now().toString();
    const daysInMonth = new Date(year, month, 0).getDate();
    
    const newSession: MonthSession = {
      id,
      name,
      month,
      year,
      days: daysInMonth,
      capital: 15480000,
      capitalFemale: 15480000,
      capitalMale: 15480000,
      totalSessions: 129,
      totalSessionsFemale: 129,
      totalSessionsMale: 129,
      supportSalary: 0,
      schedule: {},
      financials: {},
      kolFinancials: [],
      lockedHosts: [],
      gmvMaxWomen: { gmv: 0, ads: 0, cast: 0, tro: 0, ot: 0, fees: 0, grossProfit: 0, platformProfit: 0, tiktokProfit: 0, companyProfit: 0 },
      gmvMaxMen: { gmv: 0, ads: 0, cast: 0, tro: 0, ot: 0, fees: 0, grossProfit: 0, platformProfit: 0, tiktokProfit: 0, companyProfit: 0 },
      kolCompanyProfitWomen: 0,
      kolCompanyProfitMen: 0
    };

    setState(prev => ({
      ...prev,
      sessions: [...prev.sessions, newSession],
      currentSessionId: id,
    }));
  };

  const updateSchedule = (sessionId: string, day: number, shift: number, gender: 'female' | 'male', hostId: string | null) => {
    setState(prev => {
      const sessions = prev.sessions.map(s => {
        if (s.id !== sessionId) return s;
        const key = `${day}-${shift}-${gender}`;
        return {
          ...s,
          schedule: { ...s.schedule, [key]: hostId }
        };
      });
      return { ...prev, sessions };
    });
  };

  const updateFinancials = (sessionId: string, day: number, shift: number, gender: 'female' | 'male', field: keyof FinancialRecord, value: number) => {
    setState(prev => {
      const sessions = prev.sessions.map(s => {
        if (s.id !== sessionId) return s;
        const key = `${day}-${shift}-${gender}`;
        const record = s.financials[key] || { gmv: 0, ads: 0, cast: 0, tro: 0, ot: 0 };
        return {
          ...s,
          financials: {
            ...s.financials,
            [key]: { ...record, [field]: value }
          }
        };
      });
      return { ...prev, sessions };
    });
  };

  const updateSupportSalary = (sessionId: string, value: number) => {
    setState(prev => {
      const sessions = prev.sessions.map(s => {
        if (s.id === sessionId) {
          return { ...s, supportSalary: value };
        }
        return s;
      });
      return { ...prev, sessions };
    });
  };

  const setCurrentSession = (id: string) => {
    setState(prev => ({ ...prev, currentSessionId: id }));
  };

  const setLockedHosts = (sessionId: string, hostIds: string[]) => {
    setState(prev => {
      const sessions = prev.sessions.map(s => {
        if (s.id === sessionId) return { ...s, lockedHosts: hostIds };
        return s;
      });
      return { ...prev, sessions };
    });
  };

  const updateSessionMeta = (sessionId: string, capital: number, totalSessions: number, gender: 'female' | 'male') => {
    setState(prev => {
      const sessions = prev.sessions.map(s => {
        if (s.id === sessionId) {
          if (gender === 'female') {
            return { ...s, capitalFemale: capital, totalSessionsFemale: totalSessions };
          } else {
            return { ...s, capitalMale: capital, totalSessionsMale: totalSessions };
          }
        }
        return s;
      });
      return { ...prev, sessions };
    });
  };

  const addHost = (host: Omit<Host, 'id'>) => {
    setState(prev => ({
      ...prev,
      hosts: [...prev.hosts, { ...host, id: Date.now().toString() }]
    }));
  };

  const updateHost = (id: string, host: Partial<Host>) => {
    setState(prev => ({
      ...prev,
      hosts: prev.hosts.map(h => h.id === id ? { ...h, ...host } : h)
    }));
  };

  const deleteHost = (id: string) => {
    setState(prev => ({
      ...prev,
      hosts: prev.hosts.filter(h => h.id !== id)
    }));
  };

  const saveKolFinancial = (sessionId: string, record: KolFinancialRecord) => {
    setState(prev => {
      const sessions = prev.sessions.map(s => {
        if (s.id !== sessionId) return s;
        const exists = s.kolFinancials.find(k => k.id === record.id);
        if (exists) {
          return { ...s, kolFinancials: s.kolFinancials.map(k => k.id === record.id ? record : k) };
        } else {
          return { ...s, kolFinancials: [...s.kolFinancials, record] };
        }
      });
      return { ...prev, sessions };
    });
  };

  const deleteKolFinancial = (sessionId: string, recordId: string) => {
    setState(prev => {
      const sessions = prev.sessions.map(s => {
        if (s.id === sessionId) {
          const kolFinancials = (s.kolFinancials || []).filter(r => r.id !== recordId);
          return { ...s, kolFinancials };
        }
        return s;
      });
      return { ...prev, sessions };
    });
  };

  const updateGmvMax = (sessionId: string, gender: 'female' | 'male', field: keyof FinancialRecord, value: number) => {
    setState(prev => {
      const sessions = prev.sessions.map(s => {
        if (s.id === sessionId) {
          const target = gender === 'female' ? 'gmvMaxWomen' : 'gmvMaxMen';
          const current = s[target] || { gmv: 0, ads: 0, cast: 0, tro: 0, ot: 0 };
          return { ...s, [target]: { ...current, [field]: value } };
        }
        return s;
      });
      return { ...prev, sessions };
    });
  };

  const updateKolCompanyProfit = (sessionId: string, gender: 'female' | 'male', value: number) => {
    setState(prev => {
      const sessions = prev.sessions.map(s => {
        if (s.id === sessionId) {
          const target = gender === 'female' ? 'kolCompanyProfitWomen' : 'kolCompanyProfitMen';
          return { ...s, [target]: value };
        }
        return s;
      });
      return { ...prev, sessions };
    });
  };

  const resetAll = () => {
    if (confirm("Xóa toàn bộ dữ liệu?")) {
      setState({
        hosts: INITIAL_HOSTS,
        sessions: [],
        currentSessionId: null,
      });
    }
  };

  return (
    <AppContext.Provider value={{ 
      state, 
      addSession, 
      updateSessionMeta,
      updateSchedule, 
      updateFinancials, 
      updateSupportSalary,
      setCurrentSession,
      setLockedHosts,
      resetAll,
      addHost,
      updateHost,
      deleteHost,
      saveKolFinancial,
      deleteKolFinancial,
      updateGmvMax,
      updateKolCompanyProfit
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
