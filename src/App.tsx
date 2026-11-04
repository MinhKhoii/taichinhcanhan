import React, { useState } from 'react';
import { FinancialProvider, useFinancial } from './context/FinancialContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ToastContainer } from './components/layout/ToastContainer';
import { TransactionModal } from './components/modals/TransactionModal';
import { AuthModal } from './components/modals/AuthModal';
import { PinLockScreen } from './components/modals/PinLockScreen';
import { WelcomeScreen } from './components/layout/WelcomeScreen';

import { Dashboard } from './pages/Dashboard';
import { TransactionsPage } from './pages/TransactionsPage';
import { AccountsPage } from './pages/AccountsPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { SavingsPage } from './pages/SavingsPage';
import { DebtsPage } from './pages/DebtsPage';
import { ReportsPage } from './pages/ReportsPage';
import { JournalPage } from './pages/JournalPage';
import { SettingsPage } from './pages/SettingsPage';

const AppContent: React.FC = () => {
  const {
    currentTab,
    isAppLocked,
    isAuthModalOpen,
    authModalDefaultTab,
    closeAuthModal,
    isAuthenticated,
  } = useFinancial();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Nếu người dùng chưa đăng nhập (mở từ máy khác / chưa đăng nhập), chỉ hiện màn hình Chào mừng & Đăng nhập!
  // Đảm bảo người ngoài hoàn toàn KHÔNG THỂ xem thông tin của bạn!
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900">
        <WelcomeScreen />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={closeAuthModal}
          defaultTab={authModalDefaultTab}
        />
        <ToastContainer />
      </div>
    );
  }

  const renderActiveTab = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'transactions':
        return <TransactionsPage />;
      case 'accounts':
        return <AccountsPage />;
      case 'budgets':
        return <BudgetsPage />;
      case 'savings':
        return <SavingsPage />;
      case 'debts':
        return <DebtsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'journal':
        return <JournalPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* PIN Lock Screen if locked */}
      {isAppLocked && <PinLockScreen />}

      {/* Sidebar Navigation */}
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Sticky Header */}
        <Header onToggleMobileMenu={() => setIsMobileMenuOpen(true)} />

        {/* Page Content View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderActiveTab()}
        </main>
      </div>

      {/* Global Quick Add / Edit Transaction Modal */}
      <TransactionModal />

      {/* Global Auth (Login / Register) Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        defaultTab={authModalDefaultTab}
      />

      {/* Global Toast Alert Notifications */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <FinancialProvider>
      <AppContent />
    </FinancialProvider>
  );
}
