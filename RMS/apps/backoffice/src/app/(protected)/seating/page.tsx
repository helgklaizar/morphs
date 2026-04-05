"use client";

import { useEffect, useState, useRef } from "react";
import { Table } from "@rms/types";
import { TablesRepository } from "@/lib/repositories/TablesRepository";
import { CopyPlus, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SeatingPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag state
  const [draggedTableId, setDraggedTableId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [qrModalTable, setQrModalTable] = useState<Table | null>(null);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const data = await TablesRepository.fetchAll();
      // default any missing positions to 0
      setTables(data.map(t => ({ ...t, position_x: t.position_x || 0, position_y: t.position_y || 0 })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTable = async () => {
    try {
      const newTable = await TablesRepository.create({
        number: `${tables.length + 1}`,
        seats: 4,
        zone: "Основной зал",
        position_x: 50,
        position_y: 50,
        isActive: true,
      });
      setTables([...tables, newTable]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTable = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await TablesRepository.delete(id);
      setTables(tables.filter(t => t.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const updateTableFields = async (id: string, updates: Partial<Table>) => {
    try {
      const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
      if (isTauri) {
        const { LocalTablesRepository } = await import('@/lib/repositories/localTables');
        await LocalTablesRepository.update(id, updates);
      } else {
        await TablesRepository.update(id, updates);
      }
      setTables(tables.map(t => t.id === id ? { ...t, ...updates } : t));
    } catch (e) {
      console.error(e);
    }
  };

  // ----- Drag Logic -----
  const handlePointerDown = (t: Table, e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    // Offset from the exact mouse click to the top-left of the table
    // (We assume table is ~ 100px wide, maybe find better offset math)
    const tableEl = e.currentTarget;
    const tableRect = tableEl.getBoundingClientRect();

    setDraggedTableId(t.id);
    setDragOffset({
      x: e.clientX - tableRect.left,
      y: e.clientY - tableRect.top,
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggedTableId || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    let newX = e.clientX - rect.left - dragOffset.x;
    let newY = e.clientY - rect.top - dragOffset.y;

    // Snap to grid (20px)
    newX = Math.round(newX / 20) * 20;
    newY = Math.round(newY / 20) * 20;

    // Bounds check
    if (newX < 0) newX = 0;
    if (newY < 0) newY = 0;
    if (newX > rect.width - 120) newX = rect.width - 120;
    if (newY > rect.height - 120) newY = rect.height - 120;

    setTables(tables.map(t => t.id === draggedTableId ? { ...t, position_x: newX, position_y: newY } : t));
  };

  const handlePointerUp = async () => {
    if (draggedTableId) {
      const table = tables.find(t => t.id === draggedTableId);
      if (table) {
        await TablesRepository.update(table.id, { 
          position_x: table.position_x, 
          position_y: table.position_y 
        });
      }
      setDraggedTableId(null);
    }
  };

  if (loading) return <div className="p-8">Загрузка...</div>;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="flex-none p-6 border-b border-white/10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Редактор Зала</h1>
          <p className="text-white/50 text-sm mt-1">
            Перетаскивайте столы, меняйте номера и количество мест.
          </p>
        </div>
        <Button onClick={handleAddTable} className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> Добавить стол
        </Button>
      </div>

      {/* Editor Canvas */}
      <div className="flex-1 p-6 flex items-center justify-center bg-black/40 overflow-hidden select-none">
        <div 
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="relative w-full max-w-5xl h-[700px] border border-white/10 bg-white/5 rounded-3xl overflow-hidden"
          style={{ backgroundImage: 'radial-gradient(circle at 10px 10px, rgba(255,255,255,0.05) 2px, transparent 0)', backgroundSize: '20px 20px' }}
        >
          {tables.map(table => (
            <div
              key={table.id}
              onPointerDown={(e) => handlePointerDown(table, e)}
              className={`group absolute flex flex-col items-center justify-between bg-[#141414] border-2 cursor-grab active:cursor-grabbing rounded-2xl shadow-xl transition-colors duration-150 p-2 w-[110px] h-[110px] ${draggedTableId === table.id ? 'border-orange-500 z-50 ring-4 ring-orange-500/20' : 'border-white/10 z-10 hover:border-white/30'}`}
              style={{
                left: table.position_x,
                top: table.position_y,
                touchAction: 'none'
              }}
            >
              {/* Delete Button */}
              <button 
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => handleDeleteTable(table.id, e)}
                className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-red-500 border-2 border-[#141414] opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                <Trash2 className="w-3 h-3 text-white" />
              </button>

              {/* QR Code Button */}
              <button 
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setQrModalTable(table);
                }}
                className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-blue-500 border-2 border-[#141414] opacity-0 group-hover:opacity-100 hover:opacity-100 flex items-center justify-center transition-opacity"
                title="Самообслуживание (Скачать QR-код)"
              >
                <QrCode className="w-3 h-3 text-white pointer-events-none" />
              </button>

              <div className="flex w-full items-center justify-between px-1 mt-1 opacity-60">
                <div className="w-3 h-2 bg-white/20 rounded-full" />
                <div className="w-3 h-2 bg-white/20 rounded-full" />
              </div>

              <div className="flex flex-col items-center gap-1">
                <input 
                  type="text" 
                  value={table.number}
                  onPointerDown={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const newNumber = e.target.value;
                    setTables(tables.map(t => t.id === table.id ? { ...t, number: newNumber } : t));
                  }}
                  onBlur={(e) => updateTableFields(table.id, { number: e.target.value })}
                  className="w-16 bg-white/5 border border-white/10 text-center rounded text-lg font-bold outline-none text-white focus:border-orange-500 transition-colors"
                />
                
                <div className="flex items-center gap-1 bg-black/40 rounded px-1.5 py-0.5 border border-white/5">
                  <Users className="w-3 h-3 text-white/50" />
                  <input 
                    type="number"
                    value={table.seats}
                    onPointerDown={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 1;
                      setTables(tables.map(t => t.id === table.id ? { ...t, seats: v } : t));
                    }}
                    onBlur={(e) => updateTableFields(table.id, { seats: parseInt(e.target.value) || 1 })}
                    className="w-8 bg-transparent text-center font-medium text-white/70 text-xs outline-none"
                    min={1}
                  />
                </div>
              </div>

              <div className="flex w-full items-center justify-between px-1 mb-1 opacity-60">
                <div className="w-3 h-2 bg-white/20 rounded-full" />
                <div className="w-3 h-2 bg-white/20 rounded-full" />
              </div>

            </div>
          ))}

          {tables.length === 0 && !loading && (
            <div className="absolute inset-0 flex items-center justify-center flex-col text-white/30">
              <Grid className="w-16 h-16 mb-4 opacity-50" />
              <p>Нажмите "Добавить стол", чтобы начать схему зала</p>
            </div>
          )}
        </div>
      </div>
      
      {qrModalTable && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setQrModalTable(null)}>
          <div className="bg-[#141414] border border-white/10 p-8 rounded-3xl flex flex-col items-center max-w-sm w-full relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setQrModalTable(null)} className="absolute top-4 right-4 text-white/50 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold mb-1">Стол №{qrModalTable.number}</h2>
            <p className="text-white/50 text-sm mb-6 text-center">Сканируйте для меню и заказа</p>
            <div className="bg-white p-4 rounded-2xl mb-6">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(`${process.env.NEXT_PUBLIC_PB_URL || 'https://rms.shop'}/?table=${qrModalTable.number}`)}`} alt="QR" className="w-48 h-48" />
            </div>
            <button onClick={() => window.print()} className="w-full bg-blue-500 hover:bg-blue-600 font-bold py-3 text-white rounded-xl">
              Распечатать QR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Icon hack since I import Users and Grid locally
import { Users, Grid, QrCode, X } from "lucide-react";
