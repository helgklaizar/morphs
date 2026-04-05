"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Users,
  Grid,
  Coffee,
  Receipt,
  UtensilsCrossed,
  Clock,
  Plus,
  CheckCircle2,
  Map,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Table, Order } from "@rms/types";
import { TablesRepository } from "@/lib/repositories/TablesRepository";
import { useOrdersStore } from "@/store/useOrdersStore";
import { useToastStore } from "@/store/useToastStore";
import { AiInsightCard } from "@/components/ai/AiInsightCard";
import { useAiAdvisor } from "@/hooks/useAiAdvisor";

type ViewMode = "grid" | "floorplan";

// ─── Smart Seating Algorithm (Weighted Optimization) ─────────────────────────
function smartSeating(freeTables: Table[], partySize: number): Table[] {
  if (freeTables.length === 0 || partySize <= 0) return [];

  // Priority 1: Exact Single Table Fit (Sorted by seats, smallest first)
  const singleTables = freeTables
    .filter((t) => t.seats >= partySize)
    .sort((a, b) => {
      const diffA = a.seats - partySize;
      const diffB = b.seats - partySize;
      if (diffA !== diffB) return diffA - diffB; // Less waste is better
      return 0;
    });

  if (singleTables.length > 0) return [singleTables[0]];

  // Priority 2: Best Combination (Minimizing number of tables to join)
  // We use a greedy approach but sorted to minimize the table count first
  const sortedForCombo = [...freeTables].sort((a, b) => b.seats - a.seats);
  const combo: Table[] = [];
  let seatsFound = 0;
  
  for (const t of sortedForCombo) {
    combo.push(t);
    seatsFound += t.seats;
    if (seatsFound >= partySize) break;
  }

  return seatsFound >= partySize ? combo : [];
}

export default function TablesSessionsPage() {
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [partySize, setPartySize] = useState(2);
  const [showSeating, setShowSeating] = useState(false);

  const ai = useAiAdvisor('tables');

  const { orders, fetchOrders } = useOrdersStore();
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    fetchTables();
    fetchOrders();
    ai.fetchInsights();
  }, [fetchOrders, ai.fetchInsights]);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
      let data = [];
      if (isTauri) {
        const { LocalTablesRepository } = await import('@/lib/repositories/localTables');
        data = await LocalTablesRepository.fetchAll();
      } else {
        data = await TablesRepository.fetchAll();
      }
      setTables(data.filter((t) => t.isActive));
    } catch (e: any) {
      useToastStore.getState().error("Ошибка загрузки столов: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const activeOrdersByTable = useMemo(() => {
    const map: Record<string, Order[]> = {};
    tables.forEach((t) => { map[t.id] = []; });
    orders.forEach((o) => {
      if (o.status !== "completed" && o.status !== "cancelled" && o.tableId) {
        if (!map[o.tableId]) map[o.tableId] = [];
        map[o.tableId].push(o as Order);
      }
    });
    return map;
  }, [orders, tables]);

  const freeTables = useMemo(
    () => tables.filter((t) => (activeOrdersByTable[t.id]?.length ?? 0) === 0),
    [tables, activeOrdersByTable]
  );

  const suggestion = useMemo(
    () => (showSeating ? smartSeating(freeTables, partySize) : []),
    [freeTables, partySize, showSeating]
  );
  const suggestedIds = new Set(suggestion.map((t) => t.id));

  const closeTableSession = async (tableId: string) => {
    const tableOrders = activeOrdersByTable[tableId] || [];
    if (tableOrders.length === 0) return;
    setIsClosing(true);
    try {
      const { OrdersRepository } = await import("@/lib/repositories/orders");
      for (const order of tableOrders) {
        await OrdersRepository.updateStatus(order.id, "completed");
      }
      useToastStore.getState().success("Стол успешно закрыт.");
      setSelectedTable(null);
      await fetchOrders();
    } catch (e: any) {
      useToastStore.getState().error("Ошибка при закрытии стола: " + e.message);
    } finally {
      setIsClosing(false);
    }
  };

  if (loading) return <div className="p-8 text-white/50">Загрузка залов...</div>;

  const tableOrders = selectedTable ? activeOrdersByTable[selectedTable.id] || [] : [];
  const tableSessionTotal = tableOrders.reduce((acc, o) => acc + o.totalAmount, 0);
  const allSessionItems = tableOrders.flatMap((o) => o.items || []);

  // Floor Plan: normalize positions to canvas
  const CANVAS_W = 700, CANVAS_H = 420, PAD = 56, CELL = 72;
  const hasPositions = tables.some((t) => t.position_x > 0 || t.position_y > 0);
  const xs = tables.map((t) => t.position_x);
  const ys = tables.map((t) => t.position_y);
  const minX = Math.min(...xs, 0), maxX = Math.max(...xs, 1);
  const minY = Math.min(...ys, 0), maxY = Math.max(...ys, 1);
  const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;
  const getPos = (t: Table) => ({
    x: PAD + ((t.position_x - minX) / rangeX) * (CANVAS_W - PAD * 2),
    y: PAD + ((t.position_y - minY) / rangeY) * (CANVAS_H - PAD * 2),
  });

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="flex-none p-6 border-b border-white/10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Обслуживание Залов</h1>
          <p className="text-sm text-white/40">Управление столами: пречеки, дозаказы, закрытие счетов.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Smart Seating toggle */}
          <button
            onClick={() => setShowSeating(!showSeating)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              showSeating
                ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                : "bg-white/5 border-white/10 text-white/50 hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Smart Seating
          </button>

          {/* View toggle */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "grid" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
              }`}
            >
              <Grid className="w-3.5 h-3.5" /> Сетка
            </button>
            <button
              onClick={() => setViewMode("floorplan")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "floorplan" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
              }`}
            >
              <Map className="w-3.5 h-3.5" /> Floor Plan
            </button>
          </div>
        </div>
      </div>

      <AiInsightCard 
        module="tables" 
        insights={ai.insights} 
        isLoading={ai.isLoading} 
        onRefresh={ai.fetchInsights}
        className="m-6 shrink-0" 
      />

      {/* Smart Seating Panel */}
      {showSeating && (
        <div className="flex-none px-6 py-3 border-b border-white/5 bg-purple-500/5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-xs text-purple-300 font-bold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Smart Seating — укажи кол-во гостей:
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPartySize(Math.max(1, partySize - 1))}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold transition-all flex items-center justify-center border border-white/5"
              >−</button>
              <span className="text-lg font-black min-w-[20px] text-center text-white">{partySize}</span>
              <button
                onClick={() => setPartySize(partySize + 1)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold transition-all flex items-center justify-center border border-white/5"
              >+</button>
            </div>
            {suggestion.length > 0 ? (
              <span className="text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-lg">
                ✓ Рекомендую: Стол {suggestion.map((t) => `#${t.number}`).join(" + ")}{" "}
                ({suggestion.reduce((a, t) => a + t.seats, 0)} мест)
              </span>
            ) : (
              <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg">
                Нет свободных столов для {partySize} гостей
              </span>
            )}
          </div>

          {suggestion.length > 0 && (
            <button
              onClick={() => setSelectedTable(suggestion[0])}
              className="px-4 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs font-black rounded-lg shadow-lg shadow-purple-500/20 transition-all active:scale-95 flex items-center gap-2 uppercase tracking-tight"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Рассадить за Стол #{suggestion[0].number}
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {tables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-white/30 border-2 border-dashed border-white/10 rounded-3xl">
            <Grid className="w-12 h-12 mb-4 opacity-50" />
            <p>Столы еще не настроены (перейдите в редактор зала)</p>
          </div>
        ) : viewMode === "grid" ? (
          /* ── GRID VIEW ── */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pt-4">
            {tables.map((table) => {
              const tableDineOrders = activeOrdersByTable[table.id] || [];
              const isOccupied = tableDineOrders.length > 0;
              const isSuggested = suggestedIds.has(table.id);
              const total = tableDineOrders.reduce((acc, o) => acc + o.totalAmount, 0);
              return (
                <button
                  key={table.id}
                  onClick={() => setSelectedTable(table)}
                  className={`relative flex flex-col items-center justify-center aspect-square rounded-3xl border-2 transition-all p-4 ${
                    isSuggested
                      ? "bg-purple-500/10 border-purple-500 shadow-lg shadow-purple-500/20 scale-105"
                      : isOccupied
                      ? "bg-orange-500/10 border-orange-500 hover:bg-orange-500/20 translate-y-[-4px] shadow-lg shadow-orange-500/20"
                      : "bg-[#141414] border-white/10 hover:border-white/30 hover:bg-white/5"
                  }`}
                >
                  <div className={`text-4xl font-black tracking-tighter mb-2 ${isSuggested ? "text-purple-400" : isOccupied ? "text-orange-500" : "text-white/80"}`}>
                    {table.number}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-white/50 mb-4">
                    <Users className="w-3 h-3" /> {table.seats} мест
                  </div>
                  {table.zone && <div className="text-[10px] text-white/20 uppercase tracking-wider">{table.zone}</div>}
                  {isOccupied && (
                    <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Занят
                    </div>
                  )}
                  {isSuggested && (
                    <div className="absolute -top-3 -left-3 bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                    </div>
                  )}
                  {isOccupied && (
                    <div className="text-orange-400 font-bold mt-auto bg-black/40 px-3 py-1 rounded-full text-sm">
                      {total} ₪
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          /* ── FLOOR PLAN VIEW ── */
          <div>
            {!hasPositions && (
              <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-lg mb-4 inline-flex items-center gap-2">
                ⚠ У столов не заданы координаты — показана автоматическая раскладка
              </div>
            )}
            <div
              className="relative rounded-2xl border border-white/10 overflow-hidden"
              style={{ width: CANVAS_W, height: CANVAS_H, background: "rgba(255,255,255,0.02)" }}
            >
              {/* Grid lines */}
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ position: "absolute", left: 0, right: 0, top: `${(i + 1) * (CANVAS_H / 7)}px`, height: 1, background: "rgba(255,255,255,0.03)" }} />
              ))}

              {tables.map((t, idx) => {
                const pos = hasPositions
                  ? getPos(t)
                  : { x: PAD + (idx % 6) * 110, y: PAD + Math.floor(idx / 6) * 110 };
                const orders = activeOrdersByTable[t.id] || [];
                const isOccupied = orders.length > 0;
                const isSuggested = suggestedIds.has(t.id);
                const total = orders.reduce((s, o) => s + o.totalAmount, 0);
                const color = isSuggested ? "#a855f7" : isOccupied ? "#f97316" : "#22c55e";

                return (
                  <button
                    key={t.id}
                    title={`Стол #${t.number} · ${t.seats} мест`}
                    onClick={() => setSelectedTable(t)}
                    style={{
                      position: "absolute",
                      left: pos.x - CELL / 2,
                      top: pos.y - CELL / 2,
                      width: CELL,
                      height: CELL,
                      borderRadius: 14,
                      background: `${color}18`,
                      border: `2px solid ${color}`,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      transition: "transform 0.15s",
                      boxShadow: isSuggested ? `0 0 18px ${color}50` : isOccupied ? `0 0 12px ${color}30` : "none",
                    }}
                    className="hover:scale-110"
                  >
                    <span style={{ fontSize: 18, fontWeight: 900, color, lineHeight: 1 }}>#{t.number}</span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{t.seats}м</span>
                    {isOccupied && (
                      <span style={{ fontSize: 9, color: "#f97316", fontWeight: 700, marginTop: 1 }}>₪{total}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-4 text-xs text-white/40">
              {[
                { color: "#22c55e", label: "Свободный" },
                { color: "#f97316", label: "Занят" },
                { color: "#a855f7", label: "Рекомендован (алгоритм)" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Table Session Modal */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="w-[450px] bg-[#141414] border-l border-white/10 flex flex-col h-full animate-in slide-in-from-right shadow-2xl">
            <div className="p-6 border-b border-white/10 bg-white/5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Coffee className="w-6 h-6 text-orange-500" />
                  Стол №{selectedTable.number}
                </h2>
                <button onClick={() => setSelectedTable(null)} className="text-white/50 hover:text-white">Закрыть</button>
              </div>
              <p className="text-sm text-white/50 flex items-center gap-1">
                <Users className="w-4 h-4" /> До {selectedTable.seats} гостей
                {selectedTable.zone && <span className="ml-2 text-white/30">· {selectedTable.zone}</span>}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-black/20 custom-scrollbar">
              {tableOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/30 text-center">
                  <UtensilsCrossed className="w-12 h-12 mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-1">Свободно</p>
                  <p className="text-sm px-8">Заказы, привязанные к этому столу, появятся здесь.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-white/5">
                    <h3 className="font-bold text-white/70 tracking-wider text-sm uppercase">Единый Пречек</h3>
                    <div className="text-xs bg-orange-500/20 text-orange-500 px-2 py-1 rounded-md font-medium">
                      {tableOrders.length} чеков/дозаказов
                    </div>
                  </div>
                  <div className="space-y-4">
                    {allSessionItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start">
                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-xs font-bold text-white/50 flex-none mt-0.5">
                            {item.quantity}x
                          </div>
                          <div>
                            <p className="font-medium text-sm leading-tight text-white/90">{item.menuItemName}</p>
                            <p className="text-xs text-white/40 mt-1">{item.priceAtTime} ₪ / шт</p>
                          </div>
                        </div>
                        <div className="font-bold text-sm text-orange-400 ml-4 py-1">
                          {(item.priceAtTime || 0) * item.quantity} ₪
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-white/5 border-t border-white/10 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-medium text-white/70">Итого стол:</span>
                <span className="text-3xl font-black tracking-tighter text-white">{tableSessionTotal} ₪</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push("/pos")}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-2xl transition-colors flex justify-center items-center gap-2"
                >
                  <Plus className="w-5 h-5" /> Дозаказать
                </button>
                <button
                  onClick={() => closeTableSession(selectedTable.id)}
                  disabled={tableOrders.length === 0 || isClosing}
                  className={`flex-1 font-bold py-4 rounded-2xl transition-all flex justify-center items-center gap-2 shadow-lg shadow-orange-500/20 ${
                    tableOrders.length === 0
                      ? "bg-white/5 text-white/30 cursor-not-allowed shadow-none"
                      : "bg-orange-500 hover:bg-orange-600 text-white hover:scale-[1.02] active:scale-[0.98]"
                  }`}
                >
                  {isClosing ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    <><Receipt className="w-5 h-5" /> Закрыть стол</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
