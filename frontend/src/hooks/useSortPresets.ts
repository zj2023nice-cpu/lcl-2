import { useState, useEffect, useCallback } from 'react';
import type { SortPreset, SortCriterion } from '@/types';

const STORAGE_KEY = 'route_sort_presets';

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function useSortPresets() {
  const [presets, setPresets] = useState<SortPreset[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPresets(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load sort presets:', err);
    }
  }, []);

  const savePresets = useCallback((newPresets: SortPreset[]) => {
    setPresets(newPresets);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPresets));
    } catch (err) {
      console.error('Failed to save sort presets:', err);
    }
  }, []);

  const savePreset = useCallback((name: string, criteria: SortCriterion[]) => {
    if (!name.trim() || criteria.length === 0) return;
    const newPreset: SortPreset = {
      id: generateId(),
      name: name.trim(),
      criteria,
      createdAt: Date.now(),
    };
    savePresets([...presets, newPreset]);
  }, [presets, savePresets]);

  const deletePreset = useCallback((id: string) => {
    savePresets(presets.filter(p => p.id !== id));
  }, [presets, savePresets]);

  const loadPreset = useCallback((id: string): SortCriterion[] | null => {
    const preset = presets.find(p => p.id === id);
    return preset ? preset.criteria : null;
  }, [presets]);

  return {
    presets,
    savePreset,
    deletePreset,
    loadPreset,
  };
}
