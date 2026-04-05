"use client";

import { useEffect, useState, useMemo } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { ru } from "date-fns/locale";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
  Receipt
} from "lucide-react";
import { useFinanceStore, FinanceTransaction } from "@/store/useFinanceStore";
import { useToastStore } from "@/store/useToastStore";

export default function FinancePage() {
  const { transactions, categories, isLoading, fetchTransactions, fetchCategories, deleteTransaction } = useFinanceStore();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  
  // Israeli mikdamot default to 3%
  const [mikdamotRate, setMikdamotRate] = useState<number>(3.0);

  const monthStr = format(currentMonth, 'yyyy-MM');

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchTransactions(monthStr);
  }, [monthStr, fetchTransactions]);

  const filteredTransactions = useMemo(() => {
    if (typeFilter === "all") return transactions;
    return transactions.filter(t => t.type === typeFilter);
  }, [transactions, typeFilter]);

  const stats = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    // Ma'am (VAT) logic (Israel: typically 17% collected/paid, but here we just show what's marked as having Maam)
    const incomeWithMaam = transactions.filter(t => t.type === 'income' && t.has_maam).reduce((sum, t) => sum + t.amount, 0);
    const expenseWithMaam = transactions.filter(t => t.type === 'expense' && t.has_maam).reduce((sum, t) => sum + t.amount, 0);
    
    const outputMaam = incomeWithMaam * (17 / 117);
    const inputMaam = expenseWithMaam * (17 / 117);
    const maamToPay = outputMaam - inputMaam;

    const mikdamotAmount = income * (mikdamotRate / 100);
    
    return { 
      income, 
      expense, 
      profit: income - expense,
      incomeWithMaam,
      expenseWithMaam,
      outputMaam,
      inputMaam,
      maamToPay,
      mikdamotAmount
    };
  }, [transactions, mikdamotRate]);

  return (
    <div className="flex h-full flex-col animate-in fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-500" /> Финансы (P&L)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Учет доходов, расходов и чеков (Хешбониот)
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-[#1a1a1a] rounded-xl border border-white/10 p-1 mr-4">
            <button 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="w-32 text-center font-bold capitalize">
              {format(currentMonth, "LLLL yyyy", { locale: ru })}
            </span>
            <button 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button 
            onClick={() => setIsTaxModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-black transition-all shadow-lg shadow-indigo-500/20"
          >
            <FileText className="w-5 h-5" />
            PDF Отчет
          </button>
          
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-5 h-5" />
            Транзакция
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8 shrink-0">
         <div className="bg-[#141414] border border-white/5 p-6 rounded-2xl">
           <div className="flex items-center gap-3 mb-2 text-white/50">
             <TrendingUp className="w-5 h-5 text-emerald-500" />
             <span className="font-bold uppercase tracking-wider text-xs">Доходы (Income)</span>
           </div>
           <div className="text-3xl font-black text-emerald-500">{stats.income.toFixed(2)} ₪</div>
         </div>
         <div className="bg-[#141414] border border-white/5 p-6 rounded-2xl">
           <div className="flex items-center gap-3 mb-2 text-white/50">
             <TrendingDown className="w-5 h-5 text-red-500" />
             <span className="font-bold uppercase tracking-wider text-xs">Расходы (Expenses)</span>
           </div>
           <div className="text-3xl font-black text-red-500">{stats.expense.toFixed(2)} ₪</div>
         </div>
         <div className="bg-[#141414] border border-white/5 p-6 rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-[#222]">
           <div className="flex items-center gap-3 mb-2 text-white/50">
             <DollarSign className="w-5 h-5 text-white" />
             <span className="font-bold uppercase tracking-wider text-xs">Прибыль (EBITDA)</span>
           </div>
           <div className={`text-3xl font-black ${stats.profit >= 0 ? "text-white" : "text-red-500"}`}>
             {stats.profit.toFixed(2)} ₪
           </div>
         </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 shrink-0 bg-[#141414] p-1 border border-white/5 rounded-xl w-fit">
        <button 
          onClick={() => setTypeFilter("all")}
          className={`px-4 py-2 font-bold text-sm transition-all rounded-lg ${typeFilter === 'all' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white/80'}`}
        >Все операции</button>
        <button 
          onClick={() => setTypeFilter("income")}
          className={`px-4 py-2 font-bold text-sm transition-all rounded-lg flex items-center gap-2 ${typeFilter === 'income' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-white/40 hover:text-white/80 border border-transparent'}`}
        ><TrendingUp className="w-4 h-4" /> Поступления</button>
        <button 
          onClick={() => setTypeFilter("expense")}
          className={`px-4 py-2 font-bold text-sm transition-all rounded-lg flex items-center gap-2 ${typeFilter === 'expense' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-white/40 hover:text-white/80 border border-transparent'}`}
        ><TrendingDown className="w-4 h-4" /> Траты</button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto bg-[#111] rounded-2xl border border-white/5">
        {isLoading ? (
           <div className="flex h-full flex-col items-center justify-center">
             <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mb-4" />
             <p className="text-white/60">Загрузка данных...</p>
           </div>
        ) : filteredTransactions.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-full text-center">
             <Receipt className="w-16 h-16 text-white/10 mb-4" />
             <h2 className="text-xl font-bold text-white/50">Нет операций</h2>
             <p className="text-sm text-white/30 max-w-sm mt-2">
               В этом месяце еще не добавлено ни одной транзакции.
             </p>
           </div>
        ) : (
          <table className="w-full text-left">
             <thead className="bg-[#1a1a1a] sticky top-0 border-b border-white/5 shadow-md">
               <tr>
                 <th className="p-4 text-xs font-black uppercase text-white/30 tracking-widest w-[120px]">Дата</th>
                 <th className="p-4 text-xs font-black uppercase text-white/30 tracking-widest">Описание</th>
                 <th className="p-4 text-xs font-black uppercase text-white/30 tracking-widest">Категория</th>
                 <th className="p-4 text-xs font-black uppercase text-white/30 tracking-widest text-right">Сумма</th>
                 <th className="p-4 text-xs font-black uppercase text-white/30 tracking-widest w-[80px] text-center">Чек</th>
                 <th className="p-4 text-xs font-black uppercase text-white/30 tracking-widest w-[80px]"></th>
               </tr>
             </thead>
             <tbody>
               {filteredTransactions.map((t) => (
                 <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                   <td className="p-4 text-sm font-mono text-white/60">
                     {format(new Date(t.date), "dd.MM.yyyy")}
                   </td>
                   <td className="p-4">
                     <div className="font-bold">{t.description || '—'}</div>
                     {t.has_maam && <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 mt-1 inline-block bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">НДС / МААМ Учтен</span>}
                   </td>
                   <td className="p-4">
                     <span className="bg-[#222] px-3 py-1.5 rounded-lg text-xs font-bold text-white/70 inline-flex items-center gap-2 border border-white/10">
                       {t.type === 'income' ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
                       {t.category?.name || 'Без категории'}
                     </span>
                   </td>
                   <td className={`p-4 text-right font-black ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                     {t.type === 'income' ? '+' : '-'}{t.amount.toFixed(2)} ₪
                   </td>
                   <td className="p-4 text-center">
                     {t.receipt_url ? (
                       <a href={t.receipt_url} target="_blank" rel="noreferrer" className="inline-flex p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors border border-blue-500/20">
                         <FileText className="w-4 h-4" />
                       </a>
                     ) : (
                       <span className="text-white/20">—</span>
                     )}
                   </td>
                   <td className="p-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                     {!t.is_synthetic && (
                       <button 
                         onClick={() => { if(confirm("Удалить операцию?")) deleteTransaction(t.id) }} 
                         className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                     )}
                   </td>
                 </tr>
               ))}
             </tbody>
          </table>
        )}
      </div>

      {isAddModalOpen && (
        <AddTransactionModal onClose={() => setIsAddModalOpen(false)} />
      )}

      {isTaxModalOpen && (
        <TaxReportModal 
          onClose={() => setIsTaxModalOpen(false)} 
          stats={stats} 
          monthStr={monthStr}
          mikdamotRate={mikdamotRate}
          setMikdamotRate={setMikdamotRate}
        />
      )}
    </div>
  );
}

function AddTransactionModal({ onClose }: { onClose: () => void }) {
  const { categories, addTransaction, addCategory } = useFinanceStore();
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [hasMaam, setHasMaam] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCategories = categories.filter(c => c.type === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId || !date) return;
    setIsSubmitting(true);
    try {
      await addTransaction({
        type,
        amount: parseFloat(amount),
        category_id: categoryId,
        date,
        description,
        has_maam: hasMaam
      }, file || undefined);
      onClose();
    } catch (e: any) {
      useToastStore.getState().error("Ошибка при сохранении: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#111] p-6 rounded-[24px] border border-white/10 w-[500px] shadow-2xl relative">
        <h2 className="text-2xl font-black mb-6 tracking-tight">Новая операция</h2>

        <div className="flex bg-[#1a1a1a] p-1 rounded-xl mb-6">
          <button 
            type="button"
            className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${type === 'expense' ? 'bg-red-500 text-white shadow-lg' : 'text-white/40 hover:text-white/80'}`}
            onClick={() => { setType('expense'); setCategoryId(''); }}
          >Расход</button>
          <button 
            type="button"
            className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${type === 'income' ? 'bg-emerald-500 text-white shadow-lg' : 'text-white/40 hover:text-white/80'}`}
            onClick={() => { setType('income'); setCategoryId(''); }}
          >Доход</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
           <div className="flex gap-4">
             <div className="flex-1 flex flex-col gap-2">
               <label className="text-xs font-black uppercase text-white/50 tracking-widest pl-1">Сумма (₪)</label>
               <input 
                 type="number" 
                 step="0.01" 
                 required 
                 value={amount} 
                 onChange={e => setAmount(e.target.value)} 
                 className="bg-[#1a1a1a] border border-white/10 px-4 py-3 rounded-xl outline-none focus:border-white/30 text-xl font-bold"
                 placeholder="0.00"
                 autoFocus
               />
             </div>
             <div className="flex-1 flex flex-col gap-2">
               <label className="text-xs font-black uppercase text-white/50 tracking-widest pl-1">Дата</label>
               <input 
                 type="date" 
                 required 
                 value={date} 
                 onChange={e => setDate(e.target.value)} 
                 className="bg-[#1a1a1a] border border-white/10 px-4 py-3.5 rounded-xl outline-none focus:border-white/30 text-sm font-bold"
               />
             </div>
           </div>

           <div className="flex flex-col gap-2">
             <div className="flex items-center justify-between">
               <label className="text-xs font-black uppercase text-white/50 tracking-widest pl-1">Категория</label>
               <button 
                 type="button" 
                 onClick={async () => {
                   const newCat = prompt("Название новой категории:");
                   if(newCat) {
                     await addCategory({ name: newCat, type, is_tax_deductible: true });
                   }
                 }} 
                 className="text-xs font-bold text-emerald-500 hover:text-emerald-400 pr-1"
               >
                 + Новая категория
               </button>
             </div>
             <select 
               required
               value={categoryId}
               onChange={e => setCategoryId(e.target.value)}
               className="bg-[#1a1a1a] border border-white/10 px-4 py-3.5 rounded-xl outline-none focus:border-white/30 text-sm font-bold text-white w-full"
             >
               <option value="" disabled className="text-white/50">Выберите категорию</option>
               {filteredCategories.map(c => (
                 <option key={c.id} value={c.id}>{c.name}</option>
               ))}
             </select>
           </div>

           <div className="flex flex-col gap-2">
             <label className="text-xs font-black uppercase text-white/50 tracking-widest pl-1">Описание / Контрагент</label>
             <input 
               type="text" 
               value={description} 
               onChange={e => setDescription(e.target.value)} 
               className="bg-[#1a1a1a] border border-white/10 px-4 py-3 rounded-xl outline-none focus:border-white/30 text-sm font-medium"
               placeholder="Например: Закупка мяса, Оплата аренды..."
             />
           </div>

           <div className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-xl border border-white/5">
             <div className="flex flex-col">
               <span className="text-sm font-bold">Включает НДС (МААМ 17%)</span>
               <span className="text-xs text-white/40 font-medium">Для отчета в конце месяца</span>
             </div>
             <label className="relative inline-flex items-center cursor-pointer">
               <input type="checkbox" checked={hasMaam} onChange={e => setHasMaam(e.target.checked)} className="sr-only peer" />
               <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500 shadow-inner"></div>
             </label>
           </div>

           <div className="flex flex-col gap-2">
             <label className="text-xs font-black uppercase text-white/50 tracking-widest pl-1">Прикрепить чек / Хешбонит (PDF/Image)</label>
             <input 
               type="file" 
               onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
               className="bg-[#1a1a1a] border border-white/10 px-4 py-3 rounded-xl outline-none focus:border-white/30 text-sm font-medium file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20"
             />
           </div>

           <div className="flex gap-3 pt-4 mt-2 border-t border-white/10">
             <button
               type="button"
               onClick={onClose}
               className="flex-1 py-3.5 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition-colors"
               disabled={isSubmitting}
             >
               Отмена
             </button>
             <button
               type="submit"
               className="flex-[2] py-3.5 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 text-white transition-all disabled:opacity-50"
               disabled={isSubmitting}
             >
               {isSubmitting ? "Сохраняем..." : "Сохранить операцию"}
             </button>
           </div>
        </form>
      </div>
    </div>
  );
}

function TaxReportModal({ 
  onClose, 
  stats, 
  monthStr,
  mikdamotRate,
  setMikdamotRate
}: { 
  onClose: () => void, 
  stats: any, 
  monthStr: string,
  mikdamotRate: number,
  setMikdamotRate: (r: number) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:bg-white print:p-0 print:absolute print:inset-0 text-white print:text-black">
      <div className="bg-[#111] print:bg-white rounded-3xl p-8 w-full max-w-2xl border border-white/10 shadow-2xl relative print:border-0 print:shadow-none print:w-full print:max-w-full">
        {/* Do not print the close/print buttons */}
        <div className="absolute top-6 right-6 flex gap-2 print:hidden">
          <button onClick={() => window.print()} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
            Печать PDF
          </button>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            X
          </button>
        </div>

        <div className="mb-8">
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-indigo-500 mb-1">Tax / P&L Report</h2>
          <p className="text-white/50 print:text-gray-500">Месяц: {monthStr} | Бухгалтерия (Ro'e Heshbon)</p>
        </div>

        {/* Mikdamot rate control (hidden on print) */}
        <div className="mb-6 flex items-center gap-4 bg-white/5 p-4 rounded-xl print:hidden">
           <span className="text-sm font-bold">Ставка Микдамот (%):</span>
           <input 
             type="number" 
             value={mikdamotRate} 
             onChange={e => setMikdamotRate(Number(e.target.value))}
             className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 w-24 text-center font-bold"
             step="0.1"
           />
           <span className="text-xs text-white/40">Обычно 3-5% от оборота</span>
        </div>

        <table className="w-full text-left text-sm print:text-sm">
          <thead>
             <tr className="border-b border-white/10 print:border-black/20">
               <th className="pb-3 text-white/50 print:text-black">Статья</th>
               <th className="pb-3 text-right text-white/50 print:text-black">Сумма (₪)</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-white/5 print:divide-black/10">
             <tr>
               <td className="py-4 font-bold">Оборот (Все Доходы)</td>
               <td className="py-4 text-right font-black text-emerald-500 print:text-emerald-700">{stats.income.toFixed(2)}</td>
             </tr>
             <tr>
               <td className="py-4 font-bold">Оборот с НДС (17%)</td>
               <td className="py-4 text-right">{stats.incomeWithMaam.toFixed(2)}</td>
             </tr>
             <tr>
               <td className="py-4 font-bold">Сумма НДС (К уплате)</td>
               <td className="py-4 text-right text-red-400 print:text-red-600">{stats.outputMaam.toFixed(2)}</td>
             </tr>
             
             <tr>
               <td className="py-4 font-bold">Расходы с НДС (Признанные)</td>
               <td className="py-4 text-right">{stats.expenseWithMaam.toFixed(2)}</td>
             </tr>
             <tr>
               <td className="py-4 font-bold">Входящий НДС (К возврату)</td>
               <td className="py-4 text-right text-emerald-400 print:text-emerald-600">{stats.inputMaam.toFixed(2)}</td>
             </tr>

             <tr className="bg-white/5 print:bg-gray-100/50">
               <td className="py-4 px-2 font-black italic uppercase text-indigo-400 print:text-indigo-600">ИТОГО МААМ К УПЛАТЕ</td>
               <td className="py-4 px-2 text-right font-black text-lg text-indigo-400 print:text-indigo-600">{stats.maamToPay.toFixed(2)}</td>
             </tr>

             <tr>
               <td className="py-4 font-bold">Микдамот (Налог на прибыль {mikdamotRate}%)</td>
               <td className="py-4 text-right font-black text-red-500 print:text-red-600">{stats.mikdamotAmount.toFixed(2)}</td>
             </tr>

             {/* EBIT / Final profit */}
             <tr className="border-t-2 border-white/20 print:border-black/50">
               <td className="py-4 font-bold uppercase tracking-wider">Чистая прибыль (До налогов)</td>
               <td className="py-4 text-right font-black text-xl">{stats.profit.toFixed(2)}</td>
             </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
