import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCcw, Handshake, AlertTriangle, Lightbulb, ChevronRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export type InsightType = 'tip' | 'warning' | 'success' | 'action';

export interface AiInsight {
  id: string;
  type: InsightType;
  text: string;
  action?: {
    label: string;
    onClick: () => void | Promise<void>;
  };
}

interface AiInsightCardProps {
  title?: string;
  module: 'crm' | 'menu' | 'dashboard' | 'inventory' | 'tables';
  insights: AiInsight[];
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export function AiInsightCard({
  title = "AI Советник",
  insights,
  isLoading = false,
  onRefresh,
  className
}: AiInsightCardProps) {
  const [activeInsight, setActiveInsight] = useState<number>(0);
  const [actionDone, setActionDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Reset active insight when new insights load
    setActiveInsight(0);
    setActionDone({});
  }, [insights]);

  const handleAction = async (id: string, actionFn: () => void | Promise<void>) => {
    try {
      await actionFn();
      setActionDone(prev => ({ ...prev, [id]: true }));
    } catch (e) {
      console.error("Action failed", e);
    }
  };

  const getIcon = (type: InsightType) => {
    switch (type) {
      case 'tip': return <Lightbulb className="w-5 h-5 text-yellow-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-orange-400" />;
      case 'success': return <Sparkles className="w-5 h-5 text-emerald-400" />;
      case 'action': return <Handshake className="w-5 h-5 text-indigo-400" />;
      default: return <Sparkles className="w-5 h-5 text-indigo-400" />;
    }
  };

  if (insights.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-950/40 backdrop-blur-xl",
      "shadow-[0_0_40px_-15px_rgba(124,58,237,0.15)]",
      className
    )}>
      {/* Animated Gradient Border Effect */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent opacity-50" />
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
      
      <div className="relative z-10 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-zinc-100 tracking-wide">{title}</h3>
            {isLoading && (
              <span className="flex items-center gap-1 text-xs text-indigo-400 ml-2 animate-pulse">
                <RefreshCcw className="w-3 h-3 animate-spin" />
                <span>Анализ...</span>
              </span>
            )}
          </div>
          
          {onRefresh && (
            <button 
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-full hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
            >
              <RefreshCcw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </button>
          )}
        </div>

        <div className="space-y-4">
          {insights.length === 0 && !isLoading ? (
            <div className="text-sm text-zinc-400 italic py-2">Нет новых инсайтов в данный момент.</div>
          ) : (
            <div className="flex flex-col gap-3">
              <AnimatePresence mode="popLayout">
                {insights.map((insight, idx) => (
                  <motion.div 
                    key={insight.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.1 }}
                    className={cn(
                      "p-4 rounded-xl border transition-colors",
                      insight.type === 'warning' ? "bg-orange-950/20 border-orange-900/30" :
                      insight.type === 'tip' ? "bg-yellow-950/20 border-yellow-900/30" :
                      "bg-indigo-950/20 border-indigo-900/30"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {getIcon(insight.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-200 leading-relaxed">
                          {insight.text}
                        </p>
                        
                        {insight.action && (
                          <div className="mt-3">
                            {actionDone[insight.id] ? (
                              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-md">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Выполнено
                              </div>
                            ) : (
                              <button 
                                onClick={() => handleAction(insight.id, insight.action!.onClick)}
                                className={cn(
                                  "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-all active:scale-95",
                                  insight.type === 'warning' ? "bg-orange-500/20 text-orange-300 hover:bg-orange-500/30" :
                                  insight.type === 'tip' ? "bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30" :
                                  "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30"
                                )}
                              >
                                {insight.action.label}
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
