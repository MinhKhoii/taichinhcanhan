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
  RotateCcw,
  Zap,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
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

  const [activeTab, setActiveTab] = useState<'quick_add' | 'chat'>('quick_add');

  // Chat states
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Xin chào **${user.fullName || 'bạn'}**! 👋 Tôi là **Trợ lý AI Gemini** của MoneyFlow. Bạn có thể hỏi tôi về chi tiêu, ngân sách, hoặc bấm micro để nói.`,
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

  // Auto-Save Preference & Countdown States
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(() => {
    return localStorage.getItem('moneyflow_ai_auto_save') !== 'false';
  });
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<any>(null);

  const toggleAutoSave = () => {
    const nextVal = !autoSaveEnabled;
    setAutoSaveEnabled(nextVal);
    localStorage.setItem('moneyflow_ai_auto_save', String(nextVal));
    if (!nextVal && countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      setCountdown(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setHasKey(aiService.hasApiKey());
      setApiKeyInput(aiService.getApiKey());
    }
  }, [isOpen]);

  // Cleanup speech on unmount
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

  // Scroll to bottom when messages update
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking, activeTab]);

  // Send Chat Message
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isThinking) return;

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

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: reply,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚠️ Có lỗi: ${err?.message || 'Không rõ'}. Hãy thử lại nhé!`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  // Confirm Save Parsed Transaction
  const handleConfirmAddTransaction = (data: ParsedTransactionAI) => {
    if (!data.amount || data.amount <= 0) {
      showToast('Số tiền không hợp lệ!', 'error');
      return;
    }

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);

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

    showToast(`Đã tự động lưu ${formatVND(data.amount)} (${data.note}) thành công! ⚡`, 'success');
    setParsedPreview(null);
    setQuickAddText('');
  };

  // Countdown timer effect for Auto-Save
  useEffect(() => {
    if (parsedPreview && autoSaveEnabled && parsedPreview.amount > 0) {
      setCountdown(3);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      setCountdown(null);
    }

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [parsedPreview, autoSaveEnabled]);

  // Trigger auto-save when countdown reaches 0
  useEffect(() => {
    if (countdown === 0 && parsedPreview) {
      handleConfirmAddTransaction(parsedPreview);
    }
  }, [countdown, parsedPreview]);

  // Cancel timer if modal is closed
  useEffect(() => {
    if (!isOpen) {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      setCountdown(null);
      setParsedPreview(null);
    }
  }, [isOpen]);

  // Toggle Voice Recognition in Tab 1 (Chat)
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
      showToast('Trình duyệt chưa hỗ trợ nhận diện giọng nói. Bạn vui lòng mở bằng Chrome hoặc Edge nhé!', 'error');
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = 'vi-VN';
      rec.continuous = false;
      rec.interimResults = true;

      let spokenChat = '';
      rec.onstart = () => {
        setIsListeningChat(true);
        spokenChat = '';
      };
      rec.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((res: any) => res[0].transcript)
          .join('');
        if (transcript) {
          spokenChat = transcript;
          setInputMessage(transcript);
        }
      };
      rec.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          showToast('Vui lòng cấp quyền Micro trên trình duyệt để nói!', 'error');
        }
        setIsListeningChat(false);
      };
      rec.onend = () => {
        setIsListeningChat(false);
        if (spokenChat.trim()) {
          // Tự động gửi ngay khi nói xong - không cần bấm nút gửi!
          handleSendMessage(spokenChat.trim());
        }
      };

      activeRecognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      showToast('Không thể bật micro: ' + (err?.message || 'Lỗi'), 'error');
      setIsListeningChat(false);
    }
  };

  // Toggle Voice Recognition in Tab 2 (Quick Add)
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
      showToast('Trình duyệt chưa hỗ trợ nhận diện giọng nói. Bạn vui lòng mở bằng Chrome hoặc Edge nhé!', 'error');
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = 'vi-VN';
      rec.continuous = false;
      rec.interimResults = true;

      rec.onstart = () => {
        setIsListeningQuickAdd(true);
        setQuickAddText('');
        setParsedPreview(null);
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        setCountdown(null);
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
        if (event.error === 'not-allowed') {
          showToast('Vui lòng cấp quyền Micro trên trình duyệt để nói!', 'error');
        }
        setIsListeningQuickAdd(false);
      };

      rec.onend = () => {
        setIsListeningQuickAdd(false);
        if (finalSpokenText.trim()) {
          setIsParsingQuickAdd(true);
          aiService
            .parseNaturalLanguageTransaction(finalSpokenText.trim(), categories, accounts)
            .then((parsed) => {
              setParsedPreview(parsed);
            })
            .catch(() => {
              showToast('Không thể phân tích câu nói. Hãy thử lại!', 'error');
            })
            .finally(() => setIsParsingQuickAdd(false));
        }
      };

      activeRecognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      showToast('Không thể bật micro: ' + (err?.message || 'Lỗi'), 'error');
      setIsListeningQuickAdd(false);
    }
  };

  // Text to speech helper
  const handleSpeakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
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
      showToast('Đã kích hoạt Google Gemini 3.5 Flash thành công! 🎉', 'success');
    } else {
      showToast(testResult.message, 'error');
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
    } catch {
      showToast('Không thể bóc tách nội dung câu nói.', 'error');
    } finally {
      setIsParsingQuickAdd(false);
    }
  };

  const quickPrompts = [
    'Tháng này chi tiêu thế nào?',
    'Làm sao tiết kiệm 20% thu nhập?',
    'Ai đang nợ tiền tôi?',
  ];

  const quickAddExamples = [
    'Ăn phở 45k momo',
    'Đổ xăng 70k vietinbank',
    'Mua áo 200k tiền mặt',
    'Nhận lương 15tr',
  ];

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full sm:max-w-lg md:max-w-xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-slate-200/80 dark:border-slate-800 flex flex-col h-[92vh] sm:h-[84vh] max-h-[720px] overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        
        {/* Compact Top Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm sm:text-base font-bold tracking-tight">Trợ lý AI Gemini</h3>
                <span className="inline-flex items-center gap-1 text-3xs font-semibold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Gemini 3.5 Flash
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setShowApiKeySetting(!showApiKeySetting)}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
              title="Cài đặt API Key"
            >
              <Key className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick API Key Drawer */}
        {showApiKeySetting && (
          <div className="p-3 bg-slate-900 text-white border-b border-slate-800 text-xs animate-in slide-in-from-top duration-150 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                Google Gemini API Key
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-3xs text-blue-400 hover:underline flex items-center gap-0.5"
              >
                <span>Lấy key miễn phí</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <form onSubmit={handleSaveApiKey} className="flex items-center gap-2">
              <input
                type="password"
                placeholder="Dán API Key..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
              />
              <button
                type="submit"
                disabled={isTestingKey}
                className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shrink-0"
              >
                {isTestingKey ? <RotateCcw className="w-3 h-3 animate-spin" /> : 'Lưu'}
              </button>
            </form>
          </div>
        )}

        {/* Sleek Segmented Tab Switcher */}
        <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200/70 dark:border-slate-800 shrink-0">
          <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-200/80 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('quick_add')}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                activeTab === 'quick_add'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Nói để ghi chép</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                activeTab === 'chat'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat tư vấn</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950">
          {activeTab === 'quick_add' ? (
            /* TAB 1: HERO VOICE / QUICK ADD (CLEAN & AIRY) */
            <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto space-y-4">
              
              {/* Hero Voice Section */}
              <div className="flex flex-col items-center justify-center py-4 text-center space-y-3">
                <button
                  type="button"
                  onClick={toggleVoiceQuickAdd}
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer shadow-xl ${
                    isListeningQuickAdd
                      ? 'bg-rose-600 text-white animate-pulse ring-8 ring-rose-400/40 scale-105'
                      : 'bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white hover:scale-105 active:scale-95 shadow-blue-500/30'
                  }`}
                  aria-label="Nói để ghi chép"
                >
                  {isListeningQuickAdd ? (
                    <MicOff className="w-8 h-8 sm:w-9 sm:h-9" />
                  ) : (
                    <Mic className="w-8 h-8 sm:w-9 sm:h-9 animate-bounce" />
                  )}
                </button>

                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {isListeningQuickAdd ? 'Đang lắng nghe bạn...' : 'Chạm vào Micro để nói'}
                  </h4>
                  <p className="text-2xs text-slate-400 mt-0.5">
                    {isListeningQuickAdd
                      ? 'Nói xong ngừng 1 giây để AI tự động lưu'
                      : 'Ví dụ: "Ăn bún bò 45k momo" hoặc "Đổ xăng 70k"'}
                  </p>
                </div>

                {/* Auto-save toggle */}
                <button
                  type="button"
                  onClick={toggleAutoSave}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-medium transition-all cursor-pointer border ${
                    autoSaveEnabled
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                  }`}
                  title="Bật/Tắt tự động lưu sau khi nói"
                >
                  <Zap className={`w-3 h-3 ${autoSaveEnabled ? 'text-emerald-500 fill-emerald-500' : 'text-slate-400'}`} />
                  <span>Tự động lưu: <strong>{autoSaveEnabled ? 'BẬT (3s)' : 'TẮT'}</strong></span>
                </button>
              </div>

              {/* Text Input Row as Alternative */}
              <div className="space-y-2">
                <form onSubmit={handleQuickAddParse} className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Hoặc gõ: ăn bún đậu 45k momo..."
                    value={quickAddText}
                    onChange={(e) => setQuickAddText(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 shadow-2xs"
                  />
                  <button
                    type="submit"
                    disabled={!quickAddText.trim() || isParsingQuickAdd}
                    className="px-4 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
                  >
                    {isParsingQuickAdd ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : 'Phân tích'}
                  </button>
                </form>

                {/* Example Quick Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <span className="text-3xs text-slate-400 font-semibold shrink-0">Mẫu:</span>
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
                      className="px-2.5 py-1 text-2xs bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors shrink-0 cursor-pointer shadow-2xs"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parsed Result Card */}
              {parsedPreview && (
                <div className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-blue-500 shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xs font-bold text-slate-400 uppercase block">
                        Đã nhận diện:
                      </span>
                      <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                        {parsedPreview.note}
                      </h4>
                    </div>
                    <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
                      {parsedPreview.type === 'expense' ? '-' : '+'}
                      {formatVND(parsedPreview.amount)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-2xs">
                    <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                      <span className="text-slate-400 block font-medium">Danh mục</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200 block truncate mt-0.5">
                        {parsedPreview.categoryName || 'Chung'}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                      <span className="text-slate-400 block font-medium">Ví tiền</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200 block truncate mt-0.5">
                        {parsedPreview.accountName || 'Ví mặc định'}
                      </span>
                    </div>
                  </div>

                  {/* Auto-save Countdown Notice */}
                  {countdown !== null && countdown > 0 && (
                    <div className="flex items-center justify-between px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 animate-pulse">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        Tự động lưu sau <strong className="font-black text-rose-600 dark:text-rose-400 text-sm px-1.5 py-0.5 bg-white dark:bg-slate-900 rounded-md border border-amber-200 dark:border-amber-800">{countdown}s</strong>...
                      </span>
                      <span className="text-3xs text-slate-500 dark:text-slate-400">Bấm Hủy nếu sai</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                        setCountdown(null);
                        setParsedPreview(null);
                      }}
                      className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                        setCountdown(null);
                        handleConfirmAddTransaction(parsedPreview);
                      }}
                      className="flex-2 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{countdown !== null && countdown > 0 ? `Lưu ngay (${countdown}s)` : 'Xác nhận & Lưu'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: CHAT CONVERSATION */
            <div className="flex-1 flex flex-col min-h-0">
              {/* Message List */}
              <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex items-start space-x-2.5 ${m.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                        m.role === 'assistant'
                          ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white'
                          : 'bg-slate-700 text-white'
                      }`}
                    >
                      {m.role === 'assistant' ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-xs sm:text-sm leading-relaxed shadow-xs ${
                        m.role === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 rounded-tl-none whitespace-pre-wrap'
                      }`}
                    >
                      <div className="font-normal">{m.content}</div>

                      {/* Speaker button to listen to AI response */}
                      {m.role === 'assistant' && (
                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => handleSpeakText(m.content)}
                            className="text-3xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                            title="Nghe đọc"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>{isSpeaking ? 'Dừng' : 'Nghe'}</span>
                          </button>
                          <span className="text-3xs opacity-50 text-slate-400">{m.timestamp}</span>
                        </div>
                      )}

                      {m.role === 'user' && (
                        <span className="block text-3xs mt-1 opacity-60 text-right text-white">
                          {m.timestamp}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {isThinking && (
                  <div className="flex items-start space-x-2.5">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl rounded-tl-none p-3 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 flex items-center space-x-2 shadow-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                      <span>AI đang suy nghĩ...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts Bar */}
              {messages.length <= 2 && (
                <div className="px-3 py-1.5 border-t border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 overflow-x-auto flex items-center space-x-1.5 shrink-0">
                  <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
                    Gợi ý:
                  </span>
                  {quickPrompts.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleSendMessage(q)}
                      className="px-2 py-0.5 text-2xs font-semibold rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600 transition-colors shrink-0 whitespace-nowrap cursor-pointer shadow-2xs"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat Input Bar */}
              <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 shrink-0 space-y-1.5">
                {isListeningChat && (
                  <div className="flex items-center justify-between px-3 py-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 animate-pulse">
                    <span className="flex items-center gap-1.5">
                      <Mic className="w-3 h-3 text-rose-600 animate-ping" />
                      <strong>Đang nghe...</strong> Nói xong AI sẽ tự động gửi câu hỏi
                    </span>
                    <button
                      type="button"
                      onClick={toggleVoiceChat}
                      className="text-3xs font-bold underline cursor-pointer"
                    >
                      Dừng
                    </button>
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center space-x-1.5"
                >
                  <input
                    type="text"
                    placeholder="Hỏi AI bất kỳ điều gì..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={isThinking}
                    className="flex-1 px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                  />

                  {/* Mic Button */}
                  <button
                    type="button"
                    onClick={toggleVoiceChat}
                    className={`p-2 rounded-xl transition-all cursor-pointer shrink-0 ${
                      isListeningChat
                        ? 'bg-rose-600 text-white animate-pulse shadow-md'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                    title="Nói bằng giọng nói"
                  >
                    {isListeningChat ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isThinking}
                    className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer shrink-0"
                    title="Gửi"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
