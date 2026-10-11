import { create } from 'zustand';

interface ScheduleStore {
  selectedDayMs: number;
  setSelectedDay: (ms: number) => void;
}

export const useScheduleStore = create<ScheduleStore>((set) => ({
  selectedDayMs: Date.now(),
  setSelectedDay: (ms) => set({ selectedDayMs: ms }),
}));
