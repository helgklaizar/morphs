import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-[100dvh] bg-[#080808] flex flex-col relative w-full overflow-hidden">
      
      {/* Top Banner Skeleton */}
      <div className="fixed top-0 left-0 right-0 z-40 px-4 pt-[18px] pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-[28px] h-[28px] rounded-full bg-[#1A1A1A] animate-pulse"></div>
          <div className="h-4 w-32 bg-[#1A1A1A] rounded-md animate-pulse"></div>
        </div>
      </div>

      {/* Hero Area Skeleton */}
      <div className="relative w-full flex flex-col min-h-[500px] bg-[#050505] overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[75%] z-0 bg-[#121212] animate-pulse">
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#050505] to-transparent" />
        </div>
        
        <div className="relative z-10 w-full flex flex-col mt-auto pt-[65vw] sm:pt-[45vh]">
          <div className="px-5 pb-8 w-full flex flex-col">
            <div className="h-16 sm:h-20 w-3/4 sm:w-1/2 bg-[#222] rounded-xl animate-pulse mb-6"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div className="flex flex-col">
                <div className="w-12 h-[4px] rounded-full bg-[#333] mb-4" />
                <div className="h-4 w-32 bg-[#1A1A1A] rounded animate-pulse"></div>
              </div>
              <div className="space-y-2 max-w-[440px] w-full mt-4 sm:mt-0">
                <div className="h-3 w-full bg-[#1A1A1A] rounded animate-pulse"></div>
                <div className="h-3 w-4/5 bg-[#1A1A1A] rounded animate-pulse"></div>
                <div className="h-3 w-5/6 bg-[#1A1A1A] rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Categories Skeleton */}
      <div className="sticky top-0 z-30 bg-[#080808] py-4 shadow-[0_4px_10px_rgba(0,0,0,0.8)] border-t border-white/5">
        <div className="flex items-center px-4 w-full overflow-hidden gap-2">
           {[1, 2, 3, 4, 5, 6].map((i) => (
             <div key={i} className="h-[34px] w-[90px] bg-[#1C1C1E] rounded-full animate-pulse shrink-0 border border-white/5" />
           ))}
        </div>
      </div>

      {/* Menu Grid Skeleton */}
      <div className="px-4 mt-4 pb-32">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-[#141414] rounded-[18px] border border-white/5 overflow-hidden flex flex-col animate-pulse">
              <div className="w-full aspect-[1/0.95] bg-[#1E1E1E]"></div>
              <div className="p-3 pt-3 pb-2 flex flex-col flex-1 h-[85px] justify-between">
                <div>
                  <div className="h-[14px] bg-[#2A2A2A] rounded w-full mb-2"></div>
                  <div className="h-[10px] bg-[#1A1A1A] rounded w-3/4"></div>
                </div>
              </div>
              <div className="px-2.5 pb-2.5">
                <div className="h-[44px] bg-[#1a1a1a] rounded-xl w-full border border-white/5"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
