import { create } from 'zustand';

export type StatusFilter = 'all' | 'active' | 'completed' | 'today' | 'overdue';
export type PriorityFilter = 'all' | '0' | '1' | '2';

interface TaskFiltersState {
  query: string;
  status: StatusFilter;
  categoryId: number | null;
  priority: PriorityFilter;
  setQuery: (q: string) => void;
  setStatus: (s: StatusFilter) => void;
  setCategoryId: (id: number | null) => void;
  setPriority: (p: PriorityFilter) => void;
  clearAll: () => void;
}

export const useTaskFilters = create<TaskFiltersState>((set) => ({
  query: '',
  status: 'all',
  categoryId: null,
  priority: 'all',
  setQuery: (query) => set({ query }),
  setStatus: (status) => set({ status }),
  setCategoryId: (categoryId) => set({ categoryId }),
  setPriority: (priority) => set({ priority }),
  clearAll: () => set({ query: '', status: 'all', categoryId: null, priority: 'all' }),
}));
