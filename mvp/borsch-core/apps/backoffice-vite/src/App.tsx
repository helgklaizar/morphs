import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MenuPage from './pages/menu';
import './index.css';

import ProtectedLayout from './layouts/ProtectedLayout';
import PosPage from './pages/pos';
import OrdersPage from './pages/orders';
import { RealtimeProvider } from '@rms/core';

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
            </Route>
          </Routes>
        </div>
      </BrowserRouter>
      <RealtimeProvider />
    </QueryClientProvider>
  )
}

export default App
