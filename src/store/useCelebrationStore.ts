import { create } from 'zustand';

export type CelebrationEvent =
  | { type: 'achievement'; badgeId: string; title: string; description: string; icon: string; color: string }
  | { type: 'all_done' }
  | { type: 'streak'; days: number }
  | { type: 'default'; originX?: number; originY?: number };

type Priority = 4 | 3 | 2 | 1;

function priority(ev: CelebrationEvent): Priority {
  switch (ev.type) {
    case 'achievement': return 4;
    case 'all_done':    return 3;
    case 'streak':      return 2;
    default:            return 1;
  }
}

interface CelebrationStore {
  current: CelebrationEvent | null;
  queue: CelebrationEvent[];
  celebrate: (event: CelebrationEvent) => void;
  dismiss: () => void;
}

const MAX_QUEUE = 2;

export const useCelebrationStore = create<CelebrationStore>((set, get) => ({
  current: null,
  queue: [],

  celebrate: (event) => {
    const { current, queue } = get();
    if (!current) {
      set({ current: event });
      return;
    }
    // Drop if queue is full; higher-priority events displace lower-priority queue tail
    if (queue.length >= MAX_QUEUE) {
      const minPriority = Math.min(...queue.map(priority));
      if (priority(event) > minPriority) {
        const idx = [...queue].reverse().findIndex((e) => priority(e) === minPriority);
        const newQueue = [...queue];
        newQueue.splice(queue.length - 1 - idx, 1, event);
        set({ queue: newQueue });
      }
      return;
    }
    set({ queue: [...queue, event] });
  },

  dismiss: () => {
    const { queue } = get();
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      set({ current: next, queue: rest });
    } else {
      set({ current: null });
    }
  },
}));
