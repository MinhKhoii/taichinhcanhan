import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFinancial } from '../../context/FinancialContext';
import { aiService, AIChatMessage, ParsedTransactionAI } from '../../services/aiService';
import { useModalEscape } from '../../hooks/useModalEscape';
import { formatVND } from '../../utils/formatters';
import {
  Sparkles,
  Send,
  Bot,
  User,
  X,
  Key,
  Check,
  AlertCircle,
  RotateCcw,
  Zap,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  PlusCircle,
  CheckCircle2,
  TrendingUp,
  Mic,
  MicOff,
  Volume2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    accounts,
    transactions,
    categories,
    budgets,
    savingsGoals,
    debts,
    createTransaction,
    showToast,
  } = useFinancial();

  useModalEscape(onClose, isOpen);

  const [activeTab, setActiveTab] = useState<'chat' | 'quick_add'>('chat');

  // Chat states
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Xin chào **${user.fullName || 'bạn'}**! 👋 Tôi là **Trợ lý Tài chính MoneyFlow AI** được tích hợp mô hình Google Gemini.\n\nTôi có thể giúp bạn:\n- 📊 Phân tích cơ cấu thu chi & đánh giá sức khỏe tài chính\n- 💡 Gợi ý kế hoạch tiết kiệm tiền thông minh\n- ⚡ Nhập giao dịch siêu nhanh chỉ bằng 1 câu nói (VD: *"ăn bún bò 45k momo"*)\n\nBạn muốn tìm hiểu hoặc cần hỗ trợ gì hôm nay?`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quick Add Natural Language states
  const [quickAddText, setQuickAddText] = useState('');
  const [isParsingQuickAdd, setIsParsingQuickAdd] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<ParsedTransactionAI | null>(null);

  // API Key Settings toggle
  const [showApiKeySetting, setShowApiKeySetting] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [hasKey, setHasKey] = useState(aiService.hasApiKey());

  // Voice Recognition & Speech Synthesis States
  const [isListeningChat, setIsListeningChat] = useState(false);
  const [isListeningQuickAdd, setIsListeningQuickAdd] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const activeRecognitionRef = useRef<any>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeRecognitionRef.current) {
        try {
          activeRecognitionRef.current.abort();
        } catch {}
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleVoiceChat = () => {
    if (isListeningChat) {
      if (activeRecognitionRef.current) {
        try {
          activeRecognitionRef.current.stop();
        } catch {}
      }
      setIsListeningChat(false);
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      showToast('Trình duyệt của bạn chưa hỗ trợ Web Speech API. Vui lòng mở bằng Chrome hoặc Edge nhé!', 'error');
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = 'vi-VN';
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setIsListeningChat(true);
      };

      rec.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((res: any) => res[0].transcript)
          .join('');
        if (transcript) {
          setInputMessage(transcript);
        }
      };

      rec.onerror = (event: any) => {
        console.warn('Voice error:', event.error);
        if (event.error === 'not-allowed') {
          showToast('Vui lòng cho phép quyền truy cập Micro trên trình duyệt để nói!', 'error');
        }
        setIsListeningChat(false);
      };

      rec.onend = () => {
        setIsListeningChat(false);
      };

      activeRecognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      showToast('Không thể kích hoạt micro: ' + (err?.message || 'Lỗi'), 'error');
      setIsListeningChat(false);
    }
  };

  const toggleVoiceQuickAdd = () => {
    if (isListeningQuickAdd) {
      if (activeRecognitionRef.current) {
        try {
          activeRecognitionRef.current.stop();
        } catch {}
      }
      setIsListeningQuickAdd(false);
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      showToast('Trình duyệt của bạn chưa hỗ trợ Web Speech API. Vui lòng mở bằng Chrome hoặc Edge nhé!', 'error');
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = 'vi-VN';
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setIsListeningQuickAdd(true);
      };

      let finalSpokenText = '';

      rec.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((res: any) => res[0].transcript)
          .join('');
        if (transcript) {
          finalSpokenText = transcript;
          setQuickAddText(transcript);
        }
      };

      rec.onerror = (event: any) => {
        console.warn('Voice error:', event.error);
        if (event.error === 'not-allowed') {
          showToast('Vui lòng cho phép quyền truy cập Micro trên trình duyệt để nói!', 'error');
        }
        setIsListeningQuickAdd(false);
      };

      rec.onend = () => {
        setIsListeningQuickAdd(false);
        if (finalSpokenText.trim()) {
          aiService
            .parseNaturalLanguageTransaction(finalSpokenText.trim(), categories, accounts)
            .then(setParsedPreview);
        }
      };

      activeRecognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      showToast('Không thể kích hoạt micro: ' + (err?.message || 'Lỗi'), 'error');
      setIsListeningQuickAdd(false);
    }
  };

  const handleSpeakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      showToast('Trình duyệt không hỗ trợ đọc âm thanh', 'info');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const cleanText = text.replace(/[*_#`~\[\]()]/g, '').slice(0, 300);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'vi-VN';
    utterance.rate = 1.05;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (isOpen) {
      setHasKey(aiService.hasApiKey());
      setApiKeyInput(aiService.getApiKey());
    }
  }, [isOpen]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking, activeTab]);

  if (!isOpen) return null;

  // Save API Key handler
  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestingKey(true);
    const testResult = await aiService.testConnection(apiKeyInput.trim());
    setIsTestingKey(false);

    if (testResult.success) {
      aiService.setApiKey(apiKeyInput.trim());
      setHasKey(true);
      setShowApiKeySetting(false);
      showToast('Đã lưu và kích hoạt Google Gemini AI thành công! 🎉', 'success');
    } else {
      showToast(testResult.message, 'error');
    }
  };

  const handleClearApiKey = () => {
    aiService.setApiKey('');
    setApiKeyInput('');
    setHasKey(false);
    showToast('Đã xóa API Key. Trợ lý chuyển về chế độ phân tích nội bộ!', 'info');
  };

  // Send Chat Message
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isThinking) return;

    // Check if user is typing a transaction directly in chat (e.g. "ăn trưa 45k momo")
    const isDirectTx = /(\d+(?:[.,]\d+)?)\s*(k|nghìn|ngan|tr|trieu|triệu|m|củ|lít)\b/i.test(query);

    const userMsg: AIChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsThinking(true);

    try {
      // If it looks like a transaction instruction, parse it and offer instant confirmation
      if (isDirectTx && (query.toLowerCase().includes('ăn') || query.toLowerCase().includes('mua') || query.toLowerCase().includes('chi') || query.toLowerCase().includes('nhận') || query.toLowerCase().includes('xăng'))) {
        const parsed = await aiService.parseNaturalLanguageTransaction(query, categories, accounts);
        if (parsed && parsed.amount > 0) {
          const aiResponseMsg: AIChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `✨ Mình đã phát hiện khoản **${parsed.type === 'expense' ? 'chi tiêu' : 'thu nhập'}** từ câu nói của bạn:\n- **Số tiền:** ${formatVND(parsed.amount)}\n- **Danh mục:** ${parsed.categoryName || 'Mặc định'}\n- **Tài khoản:** ${parsed.accountName || 'Ví chính'}\n- **Ghi chú:** ${parsed.note}\n\nBạn có muốn ghi chép giao dịch này ngay không?`,
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            suggestedAction: {
              type: 'add_transaction',
              data: parsed,
            },
          };
          setMessages((prev) => [...prev, aiResponseMsg]);
          setIsThinking(false);
          return;
        }
      }

      // Normal Financial Advisory Chat
      const historyFormatted = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({
          role: m.role === 'user' ? ('user' as const) : ('model' as const),
          text: m.content,
        }));

      const reply = await aiService.askFinancialAdvisor(query, historyFormatted, {
        userName: user.fullName || 'bạn',
        accounts,
        transactions,
        categories,
        budgets,
        goals: savingsGoals,
        debts,
      });

      const aiMsg: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚠️ Có lỗi khi xử lý câu hỏi: ${err?.message || 'Không rõ'}. Bạn hãy thử lại nhé!`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  // Quick Add Parse
  const handleQuickAddParse = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickAddText.trim() || isParsingQuickAdd) return;

    setIsParsingQuickAdd(true);
    try {
      const parsed = await aiService.parseNaturalLanguageTransaction(
        quickAddText.trim(),
        categories,
        accounts
      );
      setParsedPreview(parsed);
    } catch (err) {
      showToast('Không thể bóc tách nội dung câu nói. Bạn kiểm tra lại nhé!', 'error');
    } finally {
      setIsParsingQuickAdd(false);
    }
  };

  // Confirm Save Parsed Transaction
  const handleConfirmAddTransaction = (data: ParsedTransactionAI) => {
    if (!data.amount || data.amount <= 0) {
      showToast('Số tiền không hợp lệ!', 'error');
      return;
    }

    createTransaction({
      type: data.type,
      amount: data.amount,
      date: data.date || new Date().toISOString().split('T')[0],
      categoryId: data.categoryId,
      accountId: data.accountId,
      toAccountId: data.toAccountId,
      paymentMethod: data.paymentMethod,
      note: data.note,
    });

    try {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
    } catch {}

    showToast(`Đã ghi nhận ${formatVND(data.amount)} (${data.note}) thành công! ⚡`, 'success');
    setParsedPreview(null);
    setQuickAddText('');

    // If added from chat, add a success bubble
    if (activeTab === 'chat') {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `✅ Đã lưu khoản **${formatVND(data.amount)}** vào ví **${data.accountName || 'chính'}** thành công! Số dư và báo cáo đã được cập nhật tự động.`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  const quickPrompts = [
    'Tháng này tôi tiêu nhiều vào việc gì nhất?',
    'Phân tích sức khỏe tài chính & cơ cấu dòng tiền',
    'Làm sao để tôi tiết kiệm được 20% thu nhập?',
    'Kiểm tra các khoản nợ cần trả hoặc cần đòi',
  ];

  const quickAddExamples = [
    'ăn bún bò huế 45k ví momo',
    'đổ xăng xe 70k vietinbank',
    'mua áo sơ mi shopee 250k thẻ',
    'nhận tiền thưởng dự án 2.5tr vào mb bank',
    'uống trà sữa 35k tiền mặt',
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col h-[90vh] max-h-[720px] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-bold tracking-tight">Trợ lý AI Gemini</h3>
                <span className="text-3xs font-black uppercase px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {hasKey ? 'Gemini 1.5 Flash' : 'Phân tích Nội bộ'}
                </span>
              </div>
              <p className="text-2xs text-blue-100 mt-0.5">
                Cố vấn tài chính cá nhân & Nhập lệnh ngôn ngữ tự nhiên
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setShowApiKeySetting(!showApiKeySetting)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                hasKey
                  ? 'bg-white/15 hover:bg-white/25 text-white'
                  : 'bg-amber-400 text-slate-900 hover:bg-amber-300 font-bold'
              }`}
              title={hasKey ? 'Cấu hình Gemini API Key' : 'Nhập API Key Google Gemini (Miễn phí)'}
            >
              <Key className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
              title="Đóng trợ lý"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* API Key Drawer / Settings Banner */}
        {showApiKeySetting && (
          <div className="p-4 bg-slate-900 text-white border-b border-slate-800 animate-in slide-in-from-top duration-200">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  Cấu hình Google Gemini API Key (Miễn phí 100%)
                </h4>
                <p className="text-3xs text-slate-300 mt-0.5">
                  Lấy key miễn phí trong 10 giây từ Google AI Studio để mở khóa khả năng đàm thoại tự do không giới hạn.
                </p>
              </div>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-3xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 underline ml-2 shrink-0"
              >
                <span>Lấy key miễn phí</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <form onSubmit={handleSaveApiKey} className="flex flex-col sm:flex-row items-center gap-2 mt-3">
              <input
                type="password"
                placeholder="Dán API Key bắt đầu bằng AIzaSy..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="flex-1 w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
              />
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  type="submit"
                  disabled={isTestingKey}
                  className="flex-1 sm:flex-initial px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-1"
                >
                  {isTestingKey ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{isTestingKey ? 'Đang kiểm tra...' : 'Lưu & Kích hoạt'}</span>
                </button>
                {hasKey && (
                  <button
                    type="button"
                    onClick={handleClearApiKey}
                    className="p-2 text-rose-400 hover:text-rose-300 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    title="Xóa API Key"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex items-center px-4 pt-3 pb-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-800 shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Trò chuyện & Tư vấn AI</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quick_add')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'quick_add'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Nhập 1 câu (Tự tạo giao dịch)</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-950/40">
          {activeTab === 'chat' ? (
            /* TAB 1: CONVERSATIONAL CHAT */
            <div className="flex-1 flex flex-col min-h-0">
              {/* Message List */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex items-start space-x-3 ${m.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                        m.role === 'assistant'
                          ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white'
                          : 'bg-slate-700 text-white'
                      }`}
                    >
                      {m.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>

                    <div
                      className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                        m.role === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 rounded-tl-none whitespace-pre-wrap'
                      }`}
                    >
                      <div className="font-normal">{m.content}</div>

                      {/* Action Card inside Chat Message */}
                      {m.suggestedAction && m.suggestedAction.type === 'add_transaction' && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-200">
                            <span>Khoản {m.suggestedAction.data.type === 'expense' ? 'chi' : 'thu'}:</span>
                            <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                              {formatVND(m.suggestedAction.data.amount)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleConfirmAddTransaction(m.suggestedAction!.data)}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Lưu vào sổ ngay</span>
                          </button>
                        </div>
                      )}

                      {/* Speaker button to listen to AI response */}
                      {m.role === 'assistant' && (
                        <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-700/60">
                          <button
                            type="button"
                            onClick={() => handleSpeakText(m.content)}
                            className="text-3xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                            title="Nghe AI đọc câu trả lời này"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>{isSpeaking ? 'Dừng đọc' : 'Nghe đọc'}</span>
                          </button>
                          <span className="text-3xs opacity-60 text-slate-400">{m.timestamp}</span>
                        </div>
                      )}

                      {m.role === 'user' && (
                        <span className="block text-3xs mt-1.5 opacity-60 text-right text-white">
                          {m.timestamp}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {isThinking && (
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-none p-3.5 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-500 flex items-center space-x-2 shadow-xs">
                      <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                      <span>MoneyFlow AI đang phân tích dữ liệu và suy nghĩ...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts Bar */}
              {messages.length <= 2 && (
                <div className="px-4 py-2 border-t border-slate-200/70 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 overflow-x-auto flex items-center space-x-2 shrink-0">
                  <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
                    Gợi ý:
                  </span>
                  {quickPrompts.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleSendMessage(q)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600 transition-colors shrink-0 whitespace-nowrap cursor-pointer shadow-2xs"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat Input Bar */}
              <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 shrink-0 space-y-2">
                {isListeningChat && (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 animate-pulse">
                    <span className="flex items-center gap-2">
                      <Mic className="w-3.5 h-3.5 text-rose-600 animate-ping" />
                      <strong>Đang lắng nghe:</strong> Hãy nói câu hỏi hoặc khoản chi của bạn...
                    </span>
                    <button
                      type="button"
                      onClick={toggleVoiceChat}
                      className="text-3xs font-bold underline cursor-pointer hover:text-rose-900"
                    >
                      Dừng nói
                    </button>
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center space-x-2"
                >
                  <input
                    type="text"
                    placeholder="Hỏi AI bất kỳ điều gì hoặc bấm nút micro để nói..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={isThinking}
                    className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                  />

                  {/* Voice Button */}
                  <button
                    type="button"
                    onClick={toggleVoiceChat}
                    className={`p-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                      isListeningChat
                        ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-500/40 ring-2 ring-rose-400'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                    title={isListeningChat ? 'Đang nghe... Bấm để dừng' : 'Bấm để nói bằng giọng nói (Tiếng Việt)'}
                    aria-label="Nói bằng giọng nói"
                  >
                    {isListeningChat ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isThinking}
                    className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer shrink-0"
                    title="Gửi câu hỏi"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* TAB 2: NATURAL LANGUAGE QUICK ADD */
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5">
              <div className="p-4 bg-gradient-to-r from-amber-500/10 via-blue-500/10 to-indigo-500/10 rounded-2xl border border-blue-200/60 dark:border-blue-900/60">
                <div className="flex items-center space-x-2 text-xs font-bold text-blue-900 dark:text-blue-300 mb-1">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Ghi chép giao dịch thần tốc bằng 1 câu nói</span>
                </div>
                <p className="text-2xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Thay vì phải mở từng ô để bấm chọn danh mục, số tiền, ngày tháng và ví tiền... Bạn chỉ cần gõ hoặc nói tự nhiên một câu, AI sẽ tự động phân loại và điền đủ tất cả cho bạn!
                </p>
              </div>

              {/* Input Form */}
              <form onSubmit={handleQuickAddParse} className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nhập hoặc bấm Micro để nói:
                  </label>
                  <button
                    type="button"
                    onClick={toggleVoiceQuickAdd}
                    className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                      isListeningQuickAdd
                        ? 'bg-rose-600 text-white animate-pulse shadow-md ring-2 ring-rose-400'
                        : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200/80 dark:border-indigo-800'
                    }`}
                  >
                    {isListeningQuickAdd ? <MicOff className="w-3.5 h-3.5 text-white" /> : <Mic className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                    <span>{isListeningQuickAdd ? 'Đang nghe... Bấm dừng' : '🎙️ Bấm vào đây để nói'}</span>
                  </button>
                </div>

                {isListeningQuickAdd && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 animate-pulse">
                    <span className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-rose-600 animate-ping" />
                      <strong>Đang nghe giọng nói:</strong> Hãy nói: <em>"ăn trưa 45 nghìn ví momo"</em>
                    </span>
                    <button
                      type="button"
                      onClick={toggleVoiceQuickAdd}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-3xs font-bold cursor-pointer"
                    >
                      Dừng & Phân tích
                    </button>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="VD: ăn bún đậu 55k momo, đổ xăng 60k vietinbank..."
                    value={quickAddText}
                    onChange={(e) => setQuickAddText(e.target.value)}
                    className="flex-1 px-4 py-3 text-sm sm:text-base font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 shadow-inner"
                  />

                  {/* Mic Button in input */}
                  <button
                    type="button"
                    onClick={toggleVoiceQuickAdd}
                    className={`p-3 rounded-2xl transition-all cursor-pointer shrink-0 border ${
                      isListeningQuickAdd
                        ? 'bg-rose-600 text-white border-rose-600 animate-pulse shadow-md shadow-rose-500/30 ring-2 ring-rose-400'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                    title={isListeningQuickAdd ? 'Đang nghe... Bấm để dừng' : 'Bấm để nói bằng giọng nói (Tiếng Việt)'}
                  >
                    <Mic className="w-5 h-5" />
                  </button>

                  <button
                    type="submit"
                    disabled={!quickAddText.trim() || isParsingQuickAdd}
                    className="px-5 py-3 text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer disabled:opacity-50 flex items-center space-x-1.5 shrink-0"
                  >
                    {isParsingQuickAdd ? (
                      <RotateCcw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>{isParsingQuickAdd ? 'Đang bóc tách...' : 'Phân tích AI'}</span>
                  </button>
                </div>
              </form>

              {/* Example Suggestions */}
              <div>
                <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Bấm thử một câu mẫu:
                </span>
                <div className="flex flex-wrap gap-2">
                  {quickAddExamples.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => {
                        setQuickAddText(ex);
                        aiService
                          .parseNaturalLanguageTransaction(ex, categories, accounts)
                          .then(setParsedPreview);
                      }}
                      className="px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600 transition-all cursor-pointer shadow-2xs text-left"
                    >
                      "{ex}"
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview Card Result */}
              {parsedPreview && (
                <div className="p-4 sm:p-5 bg-white dark:bg-slate-800 rounded-3xl border-2 border-blue-500 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          Kết quả AI đã trích xuất
                        </h4>
                        <p className="text-3xs text-emerald-600 font-semibold">
                          Độ tin cậy: {Math.round(parsedPreview.confidence * 100)}%
                        </p>
                      </div>
                    </div>

                    <span className="text-lg font-black text-rose-600 dark:text-rose-400">
                      {parsedPreview.type === 'expense' ? '-' : '+'}
                      {formatVND(parsedPreview.amount)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700">
                      <span className="text-3xs text-slate-400 font-bold uppercase block">Loại & Danh mục</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                        {parsedPreview.type === 'expense' ? 'Chi tiêu' : 'Thu nhập'} • {parsedPreview.categoryName || 'Chung'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700">
                      <span className="text-3xs text-slate-400 font-bold uppercase block">Tài khoản & Ví</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                        {parsedPreview.accountName || 'Ví mặc định'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700">
                      <span className="text-3xs text-slate-400 font-bold uppercase block">Ghi chú</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5 truncate">
                        {parsedPreview.note}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700">
                      <span className="text-3xs text-slate-400 font-bold uppercase block">Ngày giao dịch</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                        {parsedPreview.date}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setParsedPreview(null)}
                      className="flex-1 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmAddTransaction(parsedPreview)}
                      className="flex-2 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/25 active:scale-95 cursor-pointer flex items-center justify-center space-x-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Xác nhận & Lưu ngay</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

