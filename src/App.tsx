import React, { useState } from 'react';
import { FinancialProvider, useFinancial } from './context/FinancialContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ToastContainer } from './components/layout/ToastContainer';
import { FloatingActionButtons } from './components/layout/FloatingActionButtons';
import { TransactionModal } from './components/modals/TransactionModal';
import { AIAssistantModal } from './components/modals/AIAssistantModal';
import { AuthModal } from './components/modals/AuthModal';
import { PinLockScreen } from './components/modals/PinLockScreen';
import { WelcomeScreen } from './components/layout/WelcomeScreen';
import { PWAInstallGuideModal } from './components/modals/PWAInstallGuideModal';

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
    isAIModalOpen,
    closeAIModal,
    isInstallGuideOpen,
    closeInstallGuide,
    promptInstall,
    isInstallable,
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex max-w-full overflow-x-clip">
      {/* PIN Lock Screen if locked */}
      {isAppLocked && <PinLockScreen />}

      {/* Sidebar Navigation */}
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-clip lg:pl-64">
        {/* Fixed Header */}
        <Header onToggleMobileMenu={() => setIsMobileMenuOpen(true)} />

        {/* Header spacer to prevent any content overlap */}
        <div className="h-16 w-full shrink-0" aria-hidden="true" />

        {/* Page Content View */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 pb-28 sm:pb-12 max-w-7xl w-full mx-auto overflow-x-hidden">
          {renderActiveTab()}
        </main>
      </div>

      {/* Floating Action Button (FAB) & Scroll To Top for Quick Adding Anywhere */}
      <FloatingActionButtons />

      {/* Global Quick Add / Edit Transaction Modal */}
      <TransactionModal />

      {/* Global AI Gemini Assistant Modal */}
      <AIAssistantModal isOpen={isAIModalOpen} onClose={closeAIModal} />

      {/* Global Auth (Login / Register) Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        defaultTab={authModalDefaultTab}
      />

      {/* Global Toast Alert Notifications */}
      <ToastContainer />

      {/* Global PWA Install Guide Modal */}
      <PWAInstallGuideModal
        isOpen={isInstallGuideOpen}
        onClose={closeInstallGuide}
        onPromptInstall={promptInstall}
        canPromptDirectly={isInstallable}
      />
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
