import { TaskInput, Priority, Category } from '@/types';

function daysFromNow(n: number, hour = 9, min = 0): number {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, min, 0, 0);
  return d.getTime();
}

export function getSampleTasks(categories: Category[]): TaskInput[] {
  const catId = (name: string) => categories.find((c) => c.name === name)?.id ?? null;

  return [
    {
      title: 'Review project proposal',
      notes: 'Check budget and timeline sections.',
      categoryId: catId('Work'),
      priority: Priority.High,
      dueAt: daysFromNow(0, 10, 0),
      dueHasTime: true,
    },
    {
      title: 'Buy groceries',
      notes: 'Milk, eggs, bread, fruits.',
      categoryId: catId('Shopping'),
      priority: Priority.Low,
      dueAt: daysFromNow(1),
      dueHasTime: false,
    },
    {
      title: 'Morning run',
      notes: '5km around the park.',
      categoryId: catId('Health'),
      priority: Priority.Medium,
      dueAt: daysFromNow(0, 7, 0),
      dueHasTime: true,
    },
    {
      title: 'Read chapter 5',
      notes: 'Data structures textbook.',
      categoryId: catId('Study'),
      priority: Priority.Medium,
      dueAt: daysFromNow(2),
      dueHasTime: false,
    },
    {
      title: 'Call dentist',
      notes: 'Schedule checkup appointment.',
      categoryId: catId('Health'),
      priority: Priority.High,
      dueAt: daysFromNow(-1, 11, 30),
      dueHasTime: true,
    },
    {
      title: 'Update portfolio website',
      notes: 'Add recent projects and update bio.',
      categoryId: catId('Personal'),
      priority: Priority.Low,
      dueAt: daysFromNow(3),
      dueHasTime: false,
    },
    {
      title: 'Submit assignment',
      notes: 'Mobile app development report.',
      categoryId: catId('Study'),
      priority: Priority.High,
      dueAt: daysFromNow(1, 23, 59),
      dueHasTime: true,
    },
    {
      title: 'Team standup',
      notes: 'Discuss sprint progress.',
      categoryId: catId('Work'),
      priority: Priority.Medium,
      dueAt: daysFromNow(0, 9, 0),
      dueHasTime: true,
    },
    {
      title: 'Plan weekend trip',
      notes: 'Look up hotels and activities.',
      categoryId: catId('Personal'),
      priority: Priority.Low,
      dueAt: daysFromNow(5),
      dueHasTime: false,
    },
    {
      title: 'Refill prescription',
      notes: 'Pick up from pharmacy.',
      categoryId: catId('Health'),
      priority: Priority.High,
      dueAt: daysFromNow(-2),
      dueHasTime: false,
    },
  ];
}
