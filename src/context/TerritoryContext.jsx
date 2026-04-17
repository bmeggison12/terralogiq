import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';

const TerritoryContext = createContext(null);

export function TerritoryProvider({ children, user }) {
  const [territories, setTerritories] = useState([]);
  const [activeTerritoryId, setActiveTerritoryId] = useState(() => {
    const saved = localStorage.getItem('activeTerritoryId');
    return saved ? parseInt(saved, 10) : null;
  });
  const [loading, setLoading] = useState(false);

  const loadTerritories = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.territories.list();
      setTerritories(data);
    } catch (err) {
      console.error('Failed to load territories', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTerritories();
  }, [loadTerritories]);

  const setTerritory = (id) => {
    setActiveTerritoryId(id);
    if (id === null) {
      localStorage.removeItem('activeTerritoryId');
    } else {
      localStorage.setItem('activeTerritoryId', String(id));
    }
  };

  const activeTerritory = territories.find(t => t.id === activeTerritoryId) || null;

  return (
    <TerritoryContext.Provider value={{ territories, activeTerritoryId, activeTerritory, setTerritory, loading, reload: loadTerritories }}>
      {children}
    </TerritoryContext.Provider>
  );
}

export function useTerritory() {
  const ctx = useContext(TerritoryContext);
  if (!ctx) throw new Error('useTerritory must be inside TerritoryProvider');
  return ctx;
}
