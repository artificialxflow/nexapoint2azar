'use client';

import { useState } from 'react';
import type { ViewType } from '../types';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { motion, AnimatePresence } from 'motion/react';
import { CatalogProvider } from '@/src/context/CatalogContext';
import { SettingsProvider } from '@/src/context/SettingsContext';
import BusinessGate from '@/src/components/BusinessGate';

interface DashboardShellProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  children: React.ReactNode;
}

export default function DashboardShell({
  currentView,
  onViewChange,
  children,
}: DashboardShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <CatalogProvider>
    <SettingsProvider>
    <BusinessGate>
    <div className="h-screen min-h-screen bg-nexa-bg flex overflow-hidden">
      <Sidebar
        currentView={currentView}
        onViewChange={(view) => {
          onViewChange(view);
          setIsMobileMenuOpen(false);
        }}
        isMobileOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <main className="flex-1 flex flex-col min-h-0 min-w-0 transition-all duration-300 pr-0 md:pr-72 pb-20 md:pb-0">
        <Header onMenuOpen={() => setIsMobileMenuOpen(true)} />

        <div
          className={`flex-1 overflow-y-auto custom-scrollbar-light p-4 md:p-8 max-w-[1600px] mx-auto w-full min-w-0 ${
            currentView === 'tasks' || currentView === 'work-requests'
              ? 'overflow-x-auto'
              : 'overflow-x-hidden'
          }`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
    </BusinessGate>
    </SettingsProvider>
    </CatalogProvider>
  );
}
