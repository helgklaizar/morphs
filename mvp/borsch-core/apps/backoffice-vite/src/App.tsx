import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MenuPage from './pages/menu';
import './index.css';

import ProtectedLayout from './layouts/ProtectedLayout';
import PosPage from './pages/pos';
import OrdersPage from './pages/orders';
import { RealtimeProvider } from '@rms/core';
import DashboardPage from './pages/dashboard';
import InventoryPage from './pages/inventory';
import RecipesPage from './pages/recipes';
import PurchasesPage from './pages/purchases';
import SettingsPage from './pages/settings';
import OrdersHistoryPage from './pages/orders-history';
import ClientsPage from './pages/clients';


const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="bg-[#0a0a0a] text-white min-h-screen font-sans selection:bg-orange-500/30">
          <Routes>
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<PosPage />} />
              <Route path="/menu" element={<MenuPage />} />
              <Route path="/pos" element={<PosPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/recipes" element={<RecipesPage />} />
              <Route path="/purchases" element={<PurchasesPage />} />
               <Route path="/settings" element={<SettingsPage />} />
              <Route path="/orders-history" element={<OrdersHistoryPage />} />
              <Route path="/clients" element={<ClientsPage />} />
            </Route>

          </Routes>
        </div>
      </BrowserRouter>
      <RealtimeProvider />
    </QueryClientProvider>
  )
}

export default App
