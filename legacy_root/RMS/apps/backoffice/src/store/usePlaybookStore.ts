import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export type PlaybookTab = 'kitchen' | 'bar' | 'floor' | 'manager';

export type PlaybookColumnType = 'opening' | 'shift_change' | 'closing';

export interface PlaybookTask {
  id: string;
  tab: PlaybookTab;
  column: PlaybookColumnType;
  content: string;
  isCompleted: boolean;
  order: number;
}

interface PlaybookState {
  tasks: PlaybookTask[];
  addTask: (tab: PlaybookTab, column: PlaybookColumnType, content: string) => void;
  updateTask: (id: string, content: string) => void;
  deleteTask: (id: string) => void;
  reorderTasks: (tab: PlaybookTab, column: PlaybookColumnType, startIndex: number, endIndex: number) => void;
  moveTask: (taskId: string, sourceCol: PlaybookColumnType, destCol: PlaybookColumnType, newIndex: number) => void;
}

export const usePlaybookStore = create<PlaybookState>()(
  persist(
    (set, get) => ({
      tasks: [
        { id: 't1', tab: 'kitchen', column: 'opening', content: 'Включить вытяжку и мармиты', order: 0, isCompleted: false },
        { id: 't2', tab: 'kitchen', column: 'opening', content: 'Проверить температуру в холодильниках', order: 1, isCompleted: false },
        { id: 't3', tab: 'kitchen', column: 'shift_change', content: 'Снять остатки по заготовкам', order: 0, isCompleted: false },
        { id: 't4', tab: 'kitchen', column: 'closing', content: 'Вымыть полы, вынести мусор', order: 0, isCompleted: false },
        { id: 't5', tab: 'bar', column: 'opening', content: 'Настроить помол кофемолки', order: 0, isCompleted: false },
        { id: 't6', tab: 'floor', column: 'opening', content: 'Протереть столы, расставить специи', order: 0, isCompleted: false },
      ],
      addTask: (tab, column, content) => set((state) => {
        const colTasks = state.tasks.filter(t => t.tab === tab && t.column === column);
        const newTask: PlaybookTask = {
          id: uuidv4(),
          tab,
          column,
          content,
          isCompleted: false,
          order: colTasks.length
        };
        return { tasks: [...state.tasks, newTask] };
      }),
      updateTask: (id, content) => set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, content } : t)
      })),
      deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter(t => t.id !== id)
      })),
      reorderTasks: (tab, column, startIndex, endIndex) => set((state) => {
        const result = [...state.tasks];
        const colTasks = result.filter(t => t.tab === tab && t.column === column).sort((a, b) => a.order - b.order);
        const [removed] = colTasks.splice(startIndex, 1);
        colTasks.splice(endIndex, 0, removed);
        
        colTasks.forEach((t, idx) => {
          t.order = idx;
        });
        
        return { tasks: result };
      }),
      moveTask: (taskId, sourceCol, destCol, newIndex) => set((state) => {
        const result = [...state.tasks];
        const taskIdx = result.findIndex(t => t.id === taskId);
        if (taskIdx === -1) return state;
        
        const task = result[taskIdx];
        task.column = destCol;
        
        const destTasks = result
          .filter(t => t.tab === task.tab && t.column === destCol && t.id !== taskId)
          .sort((a, b) => a.order - b.order);
        
        destTasks.splice(newIndex, 0, task);
        
        destTasks.forEach((t, idx) => {
          t.order = idx;
        });
        
        return { tasks: result };
      })
    }),
    {
      name: 'playbook-storage',
    }
  )
);
