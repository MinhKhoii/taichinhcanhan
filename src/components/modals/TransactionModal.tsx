import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFinancial } from '../../context/FinancialContext';
import { TransactionType, PaymentMethod, Account } from '../../types';
import {
  X,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Check,
  Calendar,
  CreditCard,
  Tag,
  Wallet,
  Sparkles,
  FileText,
  Zap,
  RotateCcw,
  Camera,
  Loader2,
  Plus,
  Calculator,
} from 'lucide-react';
import { DynamicIcon } from '../common/DynamicIcon';
import {
  formatVND,
  getReadableVNDWords,
  getDefaultPaymentMethodForAccount,
  getSmartAmountSuggestions,
  parseQuickAmountInput,
  getLocalDateString,
} from '../../utils/formatters';
import {
  evaluateMathExpression,
  detectCategoryFromNote,
  getQuickNoteTagsForCategory,
} from '../../utils/transactionHelpers';
import { useModalEscape } from '../../hooks/useModalEscape';
import { aiService } from '../../services/aiService';
import { ReceiptCameraModal } from '../common/ReceiptCameraModal';

export const TransactionModal: React.FC = () => {
  const {
    isAddTxOpen,
    closeAddTxModal,
    editingTransaction,
    categories,
    accounts,
    user,
    createTransaction,
    updateTransaction,
    showToast,
  } = useFinancial();

  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [note, setNote] = useState<string>('');
  const [autoDetectedCategory, setAutoDetectedCategory] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  const getTodayStr = () => getLocalDateString();
  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getLocalDateString(d);
  };

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmountStr(editingTransaction.amount.toString());
      setCategoryId(editingTransaction.categoryId || '');
      setAccountId(editingTransaction.accountId);
      setToAccountId(editingTransaction.toAccountId || '');
      setDate(editingTransaction.date);
      setPaymentMethod(editingTransaction.paymentMethod);
      setNote(editingTransaction.note || '');
      setAutoDetectedCategory(null);
    } else {
      setType('expense');
      setAmountStr('');
      setDate(getTodayStr());
      setAutoDetectedCategory(null);

      // Ưu tiên chọn tài khoản mặc định
      const savedLastId = localStorage.getItem('moneyflow_last_used_account');
      const isBankOrMoMo = (a: Account) =>
        a.type === 'bank' ||
        a.type === 'ewallet' ||
        (a.name || '').toLowerCase().includes('momo') ||
        (a.name || '').toLowerCase().includes('bank') ||
        (a.name || '').toLowerCase().includes('vietin') ||
        (a.name || '').toLowerCase().includes('vietcom') ||
        (a.name || '').toLowerCase().includes('mb');

      const defaultAcc =
        (user?.defaultAccountId && accounts.find((a) => a.id === user.defaultAccountId)) ||
        (savedLastId && accounts.find((a) => a.id === savedLastId)) ||
        accounts.find((a) => isBankOrMoMo(a) && a.balance > 0) ||
        accounts.find((a) => isBankOrMoMo(a)) ||
        accounts.find((a) => a.balance > 0) ||
        accounts[0];

      setAccountId(defaultAcc?.id || '');
      const otherAcc = accounts.find((a) => a.id !== defaultAcc?.id) || accounts[0];
      setToAccountId(otherAcc?.id || '');
      setPaymentMethod(getDefaultPaymentMethodForAccount(defaultAcc));
      setNote('');

      // Default to first expense category
      const firstExp = categories.find((c) => c.type === 'expense');
      setCategoryId(firstExp?.id || '');
    }
  }, [editingTransaction, isAddTxOpen, accounts, categories, user?.defaultAccountId]);

  useModalEscape(closeAddTxModal, isAddTxOpen);

  if (!isAddTxOpen) return null;

  // Filter categories by selected type
  const availableCategories = categories.filter((c) => c.type === type);
  const selectedCategory = categories.find((c) => c.id === categoryId);

  // Tính toán số tiền hợp lệ từ input (hỗ trợ phép tính toán trực tiếp: 35k + 20k, 120k * 2)
  const mathCalculated = evaluateMathExpression(amountStr);
  const parsedAmount =
    mathCalculated !== null
      ? mathCalculated
      : parseQuickAmountInput(amountStr) ?? parseInt(amountStr.replace(/[^0-9]/g, '') || '0', 10);

  const isMathExpression = /[+\-*\/]/.test(amountStr);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;

    // Cho phép nhập phép toán (+, -, *, /) và đơn vị k, tr, m
    if (/[+\-*\/]/.test(rawVal)) {
      setAmountStr(rawVal);
      return;
    }

    // Hỗ trợ gõ tắt kiểu ngân hàng: 50k, 250k, 2tr, 1.5tr, 2m, v.v.
    const quickParsed = parseQuickAmountInput(rawVal);
    if (
      quickParsed !== null &&
      (rawVal.toLowerCase().includes('k') ||
        rawVal.toLowerCase().includes('tr') ||
        rawVal.toLowerCase().includes('m'))
    ) {
      setAmountStr(quickParsed.toString());
      return;
    }

    const raw = rawVal.replace(/[^0-9]/g, '');
    setAmountStr(raw);
  };

  const setAmountDirectly = (val: number) => {
    setAmountStr(val.toString());
  };

  const multiplyAmount = (factor: number) => {
    if (parsedAmount > 0) {
      setAmountStr((parsedAmount * factor).toString());
    }
  };

  const clearAmount = () => {
    setAmountStr('');
    amountInputRef.current?.focus();
  };

  const smartSuggestions = getSmartAmountSuggestions(parsedAmount);

  // Xử lý khi người dùng gõ Ghi chú: Tự động đoán Danh mục phù hợp
  const handleNoteChange = (val: string) => {
    setNote(val);
    if (type !== 'transfer') {
      const detected = detectCategoryFromNote(val, categories);
      if (detected) {
        if (detected.matchedType !== type) {
          setType(detected.matchedType);
        }
        setCategoryId(detected.category.id);
        setAutoDetectedCategory(detected.category.name);
      }
    }
  };

  const processReceiptBase64 = async (base64Data: string, mimeType: string = 'image/jpeg') => {
    setIsScanning(true);
    showToast('AI Gemini đang đọc hóa đơn & bóc tách thông tin...', 'info');

    try {
      const parsed = await aiService.scanReceiptImage(base64Data, mimeType, categories, accounts);

      if (parsed.type) setType(parsed.type);
      if (parsed.amount) setAmountStr(parsed.amount.toString());
      if (parsed.note) setNote(parsed.note);
      if (parsed.categoryId) setCategoryId(parsed.categoryId);
      if (parsed.paymentMethod) setPaymentMethod(parsed.paymentMethod);
      if (parsed.date) setDate(parsed.date);
      if (parsed.accountId) setAccountId(parsed.accountId);

      showToast(`✨ Đã nhận diện: ${parsed.note} (${formatVND(parsed.amount)})!`, 'success');
      setIsCameraModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Không thể đọc được hóa đơn này', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn file hình ảnh (JPG, PNG)', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Ảnh quá lớn (> 10MB), vui lòng chọn ảnh dung lượng nhỏ hơn', 'error');
      return;
    }

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          const commaIdx = res.indexOf(',');
          resolve(commaIdx >= 0 ? res.slice(commaIdx + 1) : res);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      await processReceiptBase64(base64Data, file.type || 'image/jpeg');
    } catch (err: any) {
      showToast(err.message || 'Không thể đọc được hóa đơn này', 'error');
    }
  };

  const validateTransaction = (): boolean => {
    if (!parsedAmount || parsedAmount <= 0) {
      showToast('Vui lòng nhập số tiền hợp lệ lớn hơn 0', 'error');
      return false;
    }
    if (!accountId) {
      showToast('Vui lòng chọn tài khoản thanh toán', 'error');
      return false;
    }
    if (type === 'transfer' && (!toAccountId || toAccountId === accountId)) {
      showToast('Vui lòng chọn tài khoản nhận khác với tài khoản nguồn', 'error');
      return false;
    }
    if (type !== 'transfer' && !categoryId) {
      showToast('Vui lòng chọn một danh mục thu/chi', 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateTransaction()) return;

    if (editingTransaction) {
      updateTransaction(editingTransaction.id, {
        type,
        amount: parsedAmount,
        categoryId: type === 'transfer' ? undefined : categoryId,
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : undefined,
        date,
        paymentMethod,
        note,
      });
    } else {
      createTransaction({
        type,
        amount: parsedAmount,
        categoryId: type === 'transfer' ? undefined : categoryId,
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : undefined,
        date,
        paymentMethod,
        note,
      });
    }

    try {
      localStorage.setItem('moneyflow_last_used_account', accountId);
    } catch {
      // ignore
    }
  };

  // Tính năng "Lưu & Tiếp tục nhập" siêu tốc
  const handleSaveAndContinue = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!validateTransaction()) return;

    createTransaction({
      type,
      amount: parsedAmount,
      categoryId: type === 'transfer' ? undefined : categoryId,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      date,
      paymentMethod,
      note,
    });

    try {
      localStorage.setItem('moneyflow_last_used_account', accountId);
    } catch {
      // ignore
    }

    showToast(`✅ Đã lưu ${formatVND(parsedAmount)}! Sẵn sàng nhập tiếp...`, 'success');

    // Reset lại để nhập giao dịch tiếp theo ngay lập tức
    setAmountStr('');
    setNote('');
    setAutoDetectedCategory(null);
    amountInputRef.current?.focus();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center animate-in fade-in duration-200 modal-backdrop-lock"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAddTxModal();
      }}
    >
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col modal-content-scroll">
        {/* Header - Cố định trên cùng */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-slate-100 flex-shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base sm:text-lg font-bold text-slate-800">
              {editingTransaction ? 'Chỉnh sửa giao dịch' : 'Thêm giao dịch mới'}
            </h3>
            {!editingTransaction && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const key = aiService.getApiKey();
                    if (!key) {
                      showToast('Vui lòng vào Cài đặt -> Trợ lý AI để nhập Google Gemini API Key nhé!', 'info');
                      return;
                    }
                    setIsCameraModalOpen(true);
                  }}
                  disabled={isScanning}
                  className="flex items-center gap-1.5 px-3 py-1 text-2xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 rounded-full border border-indigo-200/80 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  title="Chụp ảnh trực tiếp hoặc tải ảnh bill/hóa đơn để AI đọc tự động"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      <span>AI đang đọc bill...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>📸 Quét Bill AI</span>
                    </>
                  )}
                </button>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleScanReceipt}
                />
              </>
            )}
          </div>
          <button
            type="button"
            onClick={closeAddTxModal}
            title="Đóng (Phím Esc)"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form chính với vùng nội dung cuộn mượt mà độc lập */}
        <form noValidate onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 modal-content-scroll">
            {/* Type Selector Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  const firstExp = categories.find((c) => c.type === 'expense');
                  if (firstExp) setCategoryId(firstExp.id);
                  setAutoDetectedCategory(null);
                }}
                className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  type === 'expense'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                <span>Chi tiêu</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('income');
                  const firstInc = categories.find((c) => c.type === 'income');
                  if (firstInc) setCategoryId(firstInc.id);
                  setAutoDetectedCategory(null);
                }}
                className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  type === 'income'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Thu nhập</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('transfer');
                  setAutoDetectedCategory(null);
                }}
                className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  type === 'transfer'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>Chuyển khoản</span>
              </button>
            </div>

            {/* Amount Input with big focus, Math Calculator & Smart Banking Suggestions */}
            <div className="bg-slate-50/90 p-4 sm:p-5 rounded-2xl border border-slate-200/90 text-center transition-all">
              <div className="flex items-center justify-between mb-1">
                <label className="text-3xs uppercase tracking-wider font-bold text-slate-400">
                  Số tiền giao dịch (VNĐ)
                </label>
              </div>

              {/* Main Display Input */}
              <div className="flex items-center justify-center space-x-1 relative">
                <input
                  ref={amountInputRef}
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  placeholder="0"
                  value={
                    isMathExpression
                      ? amountStr
                      : parsedAmount > 0
                      ? parsedAmount.toLocaleString('vi-VN')
                      : amountStr
                  }
                  onChange={handleAmountChange}
                  className="w-full text-center text-3xl sm:text-4xl font-black text-slate-900 bg-transparent focus:outline-hidden tracking-tight"
                />
                <span className="text-xl sm:text-2xl font-bold text-slate-400">₫</span>
              </div>

              {/* LIVE MATH RESULT (Khi người dùng gõ phép tính: 35k + 20k) */}
              {isMathExpression && mathCalculated !== null && (
                <div className="flex items-center justify-center space-x-1.5 py-1 px-3 mt-2 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-700 max-w-sm mx-auto animate-in fade-in">
                  <Calculator className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Kết quả phép tính: = {formatVND(mathCalculated)}</span>
                </div>
              )}

              {/* SMART BANKING SUGGESTIONS - CHỈ HIỆN KHI NGƯỜI DÙNG BẮT ĐẦU GÕ SỐ */}
              {parsedAmount > 0 && (
                <div className="pt-3 mt-2 border-t border-slate-200/70 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  {/* Vietnamese Words Readout */}
                  {getReadableVNDWords(parsedAmount) && (
                    <div className="flex items-center justify-center space-x-1.5 py-1 px-3 bg-blue-50/80 border border-blue-100 rounded-xl text-xs font-bold text-blue-700 max-w-md mx-auto">
                      <Sparkles className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      <span className="break-words leading-tight">{getReadableVNDWords(parsedAmount)}</span>
                    </div>
                  )}

                  {/* Header row with Reset */}
                  <div className="flex items-center justify-between px-1">
                    <span className="text-3xs font-bold text-slate-500 flex items-center space-x-1">
                      <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span>Gợi ý theo số "{parsedAmount.toLocaleString('vi-VN')}":</span>
                    </span>
                    <button
                      type="button"
                      onClick={clearAmount}
                      className="text-3xs font-semibold text-rose-500 hover:text-rose-700 flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Xóa số</span>
                    </button>
                  </div>

                  {/* Suggestion Chips */}
                  <div className="flex items-center justify-center flex-wrap gap-1.5">
                    {smartSuggestions.map((item) => (
                      <button
                        type="button"
                        key={item.amount}
                        onClick={() => setAmountDirectly(item.amount)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center space-x-1.5 ${
                          parsedAmount === item.amount
                            ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-500/20'
                            : 'bg-white hover:bg-blue-50 hover:border-blue-300 text-blue-700 border-slate-200'
                        }`}
                      >
                        <span>{item.label}</span>
                        {item.shortLabel && item.shortLabel !== item.label && (
                          <span
                            className={`text-3xs px-1.5 py-0.5 rounded-md font-semibold ${
                              parsedAmount === item.amount
                                ? 'bg-white/20 text-white'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {item.shortLabel}
                          </span>
                        )}
                      </button>
                    ))}

                    {/* Quick Multipliers */}
                    {parsedAmount < 10000000 && (
                      <>
                        <button
                          type="button"
                          onClick={() => multiplyAmount(1000)}
                          className="px-2.5 py-1.5 text-xs font-extrabold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
                          title="Thêm 3 số 0 (Nhân 1.000đ)"
                        >
                          +000
                        </button>
                        <button
                          type="button"
                          onClick={() => multiplyAmount(1000000)}
                          className="px-2.5 py-1.5 text-xs font-extrabold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
                          title="Thêm 6 số 0 (Nhân 1.000.000đ)"
                        >
                          +000.000
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Category Selector (If not transfer) - Lưới thẻ trực quan, thoáng mắt */}
            {type !== 'transfer' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <span>Danh mục {type === 'expense' ? 'chi tiêu' : 'thu nhập'}</span>
                  </label>
                  {autoDetectedCategory ? (
                    <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 animate-in fade-in">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      Tự động chọn: {autoDetectedCategory}
                    </span>
                  ) : (
                    <span className="text-3xs text-slate-400 font-medium">Bấm chọn 1 danh mục</span>
                  )}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-0.5">
                  {availableCategories.map((c) => {
                    const isSelected = categoryId === c.id;
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => {
                          setCategoryId(c.id);
                          setAutoDetectedCategory(null);
                        }}
                        className={`flex flex-col items-center justify-center p-2 rounded-2xl border text-center transition-all cursor-pointer relative ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-bold shadow-xs ring-2 ring-blue-500/20'
                            : 'border-slate-200/90 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700'
                        }`}
                        title={c.name}
                      >
                        {isSelected && (
                          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600" />
                        )}
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-2xs mb-1 shrink-0"
                          style={{ backgroundColor: c.color }}
                        >
                          <DynamicIcon name={c.icon} className="w-4 h-4" />
                        </div>
                        <span className="text-2xs font-semibold leading-tight line-clamp-1 w-full truncate">
                          {c.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Account(s) Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 mb-1.5 h-6">
                  <Wallet className="w-3.5 h-3.5 text-slate-400" />
                  <span>{type === 'transfer' ? 'Tài khoản nguồn' : 'Tài khoản thanh toán'}</span>
                </label>
                <select
                  value={accountId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setAccountId(newId);
                    const selectedAcc = accounts.find((a) => a.id === newId);
                    setPaymentMethod(getDefaultPaymentMethodForAccount(selectedAcc));
                  }}
                  className="w-full h-10 px-3 py-2 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatVND(a.balance)})
                    </option>
                  ))}
                </select>
              </div>

              {type === 'transfer' ? (
                <div>
                  <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 mb-1.5 h-6">
                    <Wallet className="w-3.5 h-3.5 text-blue-500" />
                    <span>Tài khoản nhận</span>
                  </label>
                  <select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="w-full h-10 px-3 py-2 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {accounts
                      .filter((a) => a.id !== accountId)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({formatVND(a.balance)})
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 mb-1.5 h-6">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    <span>Phương thức</span>
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full h-10 px-3 py-2 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="cash">Tiền mặt</option>
                    <option value="transfer">Chuyển khoản</option>
                    <option value="card">Thẻ tín dụng / ghi nợ</option>
                    <option value="qr">Quét mã QR</option>
                    <option value="ewallet">Ví điện tử</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
              )}

              {/* Quick Switch Pills for Accounts - Chọn nhanh tài khoản 1 chạm */}
              {accounts.length > 1 && (
                <div className="col-span-1 sm:col-span-2 -mt-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-nowrap py-0.5">
                  <span className="text-3xs text-slate-400 font-semibold shrink-0">Chọn nhanh:</span>
                  {accounts.map((a) => {
                    const isSelected = a.id === accountId;
                    const isBank =
                      a.type === 'bank' ||
                      (a.name || '').toLowerCase().includes('bank') ||
                      (a.name || '').toLowerCase().includes('vietin');
                    const isEwallet = a.type === 'ewallet' || (a.name || '').toLowerCase().includes('momo');
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setAccountId(a.id);
                          setPaymentMethod(getDefaultPaymentMethodForAccount(a));
                        }}
                        className={`px-2.5 py-1 rounded-xl text-2xs font-semibold whitespace-nowrap shrink-0 transition-all flex items-center gap-1 cursor-pointer select-none ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span>{isBank ? '🏦' : isEwallet ? '👛' : '💵'}</span>
                        <span>{a.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {(() => {
                const currentAcc = accounts.find((a) => a.id === accountId);
                if (currentAcc && type === 'expense' && parsedAmount > currentAcc.balance) {
                  return (
                    <div className="col-span-1 sm:col-span-2 -mt-1">
                      <p className="text-3xs text-amber-600 font-medium leading-tight">
                        ⚠️ Số dư ví hiện có {formatVND(currentAcc.balance)}. Khoản thiếu sẽ tự động cấn trừ từ tài khoản có tiền.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Date & Note (with Today/Yesterday shortcuts & Quick Note Tags) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5 h-6">
                  <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ngày giao dịch</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setDate(getTodayStr())}
                      className={`px-2 py-0.5 rounded-md text-3xs font-bold transition-all cursor-pointer ${
                        date === getTodayStr()
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Hôm nay
                    </button>
                    <button
                      type="button"
                      onClick={() => setDate(getYesterdayStr())}
                      className={`px-2 py-0.5 rounded-md text-3xs font-bold transition-all cursor-pointer ${
                        date === getYesterdayStr()
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Hôm qua
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5 h-6">
                  <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ghi chú nội dung</span>
                  </label>
                </div>
                <input
                  type="text"
                  placeholder="VD: Đổ xăng, Ăn trưa, Cà phê..."
                  value={note}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Gợi ý ghi chú nhanh 1 chạm theo danh mục đang chọn */}
              {type !== 'transfer' && (
                <div className="col-span-1 sm:col-span-2 -mt-1">
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 flex-nowrap">
                    <span className="text-3xs text-slate-400 font-semibold shrink-0">Gợi ý nhanh:</span>
                    {getQuickNoteTagsForCategory(selectedCategory?.name || '', type).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setNote(tag);
                          const detected = detectCategoryFromNote(tag, categories);
                          if (detected) {
                            setCategoryId(detected.category.id);
                            setAutoDetectedCategory(detected.category.name);
                          }
                        }}
                        className={`px-2.5 py-1 text-2xs font-medium rounded-lg border transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                          note === tag
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-bold'
                            : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit Actions - Cố định ở chân modal để bấm nhanh mọi lúc */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex-shrink-0">
            <button
              type="button"
              onClick={closeAddTxModal}
              className="px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>

            <div className="flex items-center gap-2">
              {!editingTransaction && (
                <button
                  type="button"
                  onClick={handleSaveAndContinue}
                  className="flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 active:scale-95 rounded-xl border border-blue-200/80 transition-all cursor-pointer shadow-2xs"
                  title="Lưu giao dịch này và tiếp tục nhập món mới ngay lập tức"
                >
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span className="hidden sm:inline">Lưu &</span>
                  <span>Nhập tiếp</span>
                </button>
              )}

              <button
                type="submit"
                className="flex items-center space-x-1.5 px-5 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{editingTransaction ? 'Lưu cập nhật' : 'Hoàn tất'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <ReceiptCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={processReceiptBase64}
        isScanning={isScanning}
      />
    </div>,
    document.body
  );
};
