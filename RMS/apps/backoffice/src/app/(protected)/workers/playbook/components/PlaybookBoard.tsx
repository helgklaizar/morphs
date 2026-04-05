"use client";

import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Plus, GripVertical, Trash2, Edit2, CheckCircle2 } from "lucide-react";
import { usePlaybookStore, PlaybookTab, PlaybookColumnType, PlaybookTask } from "@/store/usePlaybookStore";

interface BoardProps {
  tab: PlaybookTab;
}

const COLUMNS: { id: PlaybookColumnType; label: string; color: string }[] = [
  { id: 'opening', label: 'Открытие', color: 'border-emerald-500/30 bg-emerald-500/5' },
  { id: 'shift_change', label: 'Пересменка', color: 'border-amber-500/30 bg-amber-500/5' },
  { id: 'closing', label: 'Закрытие', color: 'border-purple-500/30 bg-purple-500/5' },
];

export function PlaybookBoard({ tab }: BoardProps) {
  const { tasks, addTask, updateTask, deleteTask, reorderTasks, moveTask } = usePlaybookStore();
  
  const [newTaskContent, setNewTaskContent] = useState<{ col: PlaybookColumnType; content: string } | null>(null);
  const [editingCard, setEditingCard] = useState<{ id: string; content: string } | null>(null);

  const tabTasks = tasks.filter(t => t.tab === tab);

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceCol = source.droppableId as PlaybookColumnType;
    const destCol = destination.droppableId as PlaybookColumnType;

    if (sourceCol === destCol) {
      reorderTasks(tab, sourceCol, source.index, destination.index);
    } else {
      moveTask(draggableId, sourceCol, destCol, destination.index);
    }
  };

  const handleAddTask = (col: PlaybookColumnType) => {
    if (newTaskContent && newTaskContent.col === col && newTaskContent.content.trim()) {
      addTask(tab, col, newTaskContent.content.trim());
      setNewTaskContent(null);
    }
  };

  const handleUpdateTask = (id: string) => {
    if (editingCard && editingCard.content.trim()) {
      updateTask(id, editingCard.content.trim());
      setEditingCard(null);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {COLUMNS.map((col) => {
          const columnTasks = tabTasks.filter(t => t.column === col.id).sort((a, b) => a.order - b.order);

          return (
            <div key={col.id} className={`rounded-3xl border ${col.color} p-4 flex flex-col min-h-[500px]`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">{col.label}</h3>
                <span className="text-xs font-bold bg-white/10 px-2 py-1 rounded-md">{columnTasks.length}</span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 space-y-3 p-1 rounded-xl transition-colors ${snapshot.isDraggingOver ? 'bg-white/5' : ''}`}
                  >
                    {columnTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`group relative bg-[#141414] border border-white/10 rounded-2xl p-4 shadow-sm transition-all ${
                              snapshot.isDragging ? 'rotate-2 scale-105 border-orange-500 shadow-xl shadow-orange-500/20 z-50' : 'hover:border-white/30'
                            }`}
                          >
                            <div className="absolute top-3 left-2 text-white/20 hover:text-white/60 cursor-grab active:cursor-grabbing" {...provided.dragHandleProps}>
                              <GripVertical className="w-5 h-5" />
                            </div>

                            <div className="pl-6">
                              {editingCard?.id === task.id ? (
                                <div className="space-y-2">
                                  <textarea
                                    className="w-full bg-[#242424] border border-white/10 rounded-xl p-2 text-sm focus:outline-none focus:border-orange-500 min-h-[80px]"
                                    value={editingCard.content}
                                    onChange={(e) => setEditingCard({ ...editingCard, content: e.target.value })}
                                    autoFocus
                                    onBlur={() => handleUpdateTask(task.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleUpdateTask(task.id);
                                      }
                                    }}
                                  />
                                </div>
                              ) : (
                                <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">{task.content}</p>
                              )}
                            </div>

                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 justify-end mt-3 pt-3 border-t border-white/5 transition-opacity">
                              <button
                                onClick={() => setEditingCard({ id: task.id, content: task.content })}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500/50 hover:text-red-500"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {newTaskContent?.col === col.id ? (
                      <div className="bg-[#141414] border border-orange-500/50 rounded-2xl p-4 shadow-lg shadow-orange-500/10 animate-in fade-in zoom-in-95">
                        <textarea
                          placeholder="Что нужно сделать?..."
                          className="w-full bg-transparent border-none focus:ring-0 text-sm focus:outline-none mb-3 resize-none h-16"
                          value={newTaskContent.content}
                          onChange={(e) => setNewTaskContent({ ...newTaskContent, content: e.target.value })}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddTask(col.id);
                            } else if (e.key === 'Escape') {
                              setNewTaskContent(null);
                            }
                          }}
                        />
                        <div className="flex justify-end gap-2 text-xs">
                          <button
                            onClick={() => setNewTaskContent(null)}
                            className="px-3 py-1.5 rounded-md hover:bg-white/5"
                          >
                            Отмена
                          </button>
                          <button
                            onClick={() => handleAddTask(col.id)}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-1.5 rounded-md transition-colors"
                          >
                            Добавить
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setNewTaskContent({ col: col.id, content: '' })}
                        className="w-full py-4 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/10 text-white/40 hover:text-white hover:border-white/30 hover:bg-white/5 mt-2 transition-all"
                      >
                        <Plus className="w-4 h-4" /> Добавить карточку
                      </button>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
