import React from 'react';
import { getReadableVNDWords, getSmartAmountSuggestions, parseQuickAmountInput } from '../../utils/formatters';
import { evaluateMathExpression } from '../../utils/transactionHelpers';
import { Sparkles, RotateCcw, Zap } from 'lucide-react';

interface QuickAmountInputProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  presets?: { label: string; value: number }[];
  addChips?: { label: string; value: number }[];
  maxSuggestion?: number;
  hideSuggestions?: boolean;
}

export const QuickAmountInput: React.FC<QuickAmountInputProps> = ({
  value,
  onChange,
  label = 'Số tiền (VNĐ)',
  placeholder = '0',
  autoFocus = false,
  className = '',
  presets = [
    { label: '50k', value: 50000 },
    { label: '100k', value: 100000 },
    { label: '200k', value: 200000 },
    { label: '500k', value: 500000 },
    { label: '1 Tr', value: 1000000 },
    { label: '2 Tr', value: 2000000 },
    { label: '5 Tr', value: 5000000 },
  ],
  addChips = [
    { label: '+50k', value: 50000 },
    { label: '+100k', value: 100000 },
    { label: '+200k', value: 200000 },
    { label: '+500k', value: 500000 },
    { label: '+1 Tr', value: 1000000 },
  ],
  maxSuggestion,
  hideSuggestions = false,
}) => {
  const [hasUserTyped, setHasUserTyped] = React.useState(false);
  const numValue = parseInt(value.replace(/[^0-9]/g, '') || '0', 10);
  const readableWords = getReadableVNDWords(numValue);
  const smartSuggestions = getSmartAmountSuggestions(numValue);
  const filteredSuggestions = maxSuggestion
    ? smartSuggestions.filter((s) => s.amount <= maxSuggestion)
    : smartSuggestions;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasUserTyped(true);
    const rawVal = e.target.value;

    const mathParsed = evaluateMathExpression(rawVal);
    if (mathParsed !== null) {
      onChange(mathParsed.toString());
      return;
    }

    const quickParsed = parseQuickAmountInput(rawVal);
    if (quickParsed !== null && (rawVal.toLowerCase().includes('k') || rawVal.toLowerCase().includes('tr') || rawVal.toLowerCase().includes('m'))) {
      onChange(quickParsed.toString());
      return;
    }

    const raw = rawVal.replace(/[^0-9]/g, '');
    onChange(raw);
  };

  const setPreset = (val: number) => {
    setHasUserTyped(true);
    onChange(val.toString());
  };

  const multiplyAmount = (factor: number) => {
    if (numValue > 0) {
      setHasUserTyped(true);
      onChange((numValue * factor).toString());
    }
  };

  const addAmount = (val: number) => {
    setHasUserTyped(true);
    onChange((numValue + val).toString());
  };

  const resetAmount = () => {
    setHasUserTyped(false);
    onChange('0');
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-700">
            {label}
          </label>
          {numValue > 0 && (
            <button
              type="button"
              onClick={resetAmount}
              className="text-xs text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Đặt lại về 0</span>
            </button>
          )}
        </div>
      )}

      {/* Main Input Box */}
      <div className="relative">
        <input
          type="text"
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={numValue > 0 ? numValue.toLocaleString('vi-VN') : (value === '0' ? '0' : '')}
          onChange={handleInputChange}
          className="w-full px-3.5 py-2.5 text-base sm:text-lg font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden tracking-tight"
        />
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 pointer-events-none">
          ₫
        </span>
      </div>

      {/* Readable Vietnamese words badge */}
      {readableWords && (
        <div className="flex items-center justify-center space-x-1.5 py-1.5 px-3 bg-blue-50/80 border border-blue-100 rounded-xl text-xs font-bold text-blue-700 animate-in fade-in duration-150">
          <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className="break-words leading-tight">{readableWords}</span>
        </div>
      )}

      {/* SMART BANKING SUGGESTIONS - CHỈ HIỆN KHI NGƯỜI DÙNG CHỦ ĐỘNG GÕ SỐ (ĐỒNG BỘ 100% VỚI TRANSACTION MODAL) */}
      {!hideSuggestions && hasUserTyped && numValue > 0 && (filteredSuggestions.length > 0 || (maxSuggestion ? numValue * 1000 <= maxSuggestion : numValue < 10000000)) && (
        <div className="pt-2.5 mt-1 border-t border-slate-200/70 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Header row with Reset */}
          <div className="flex items-center justify-between px-0.5">
            <span className="text-3xs font-bold text-slate-500 flex items-center space-x-1">
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>Gợi ý theo số "{numValue.toLocaleString('vi-VN')}":</span>
            </span>
            <button
              type="button"
              onClick={resetAmount}
              className="text-3xs font-semibold text-rose-500 hover:text-rose-700 flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Xóa số</span>
            </button>
          </div>

          {/* Suggestion Chips */}
          <div className="flex items-center flex-wrap gap-1.5">
            {filteredSuggestions.map((item) => {
              const isSelected = numValue === item.amount;
              return (
                <button
                  type="button"
                  key={item.amount}
                  onClick={() => setPreset(item.amount)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-500/20'
                      : 'bg-white hover:bg-blue-50 hover:border-blue-300 text-blue-700 border-slate-200'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.shortLabel && item.shortLabel !== item.label && (
                    <span
                      className={`text-3xs px-1.5 py-0.5 rounded-md font-semibold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {item.shortLabel}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Quick Multipliers */}
            {numValue < 10000000 && (!maxSuggestion || numValue * 1000 <= maxSuggestion) && (
              <button
                type="button"
                onClick={() => multiplyAmount(1000)}
                className="px-2.5 py-1.5 text-xs font-extrabold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
                title="Thêm 3 số 0 (Nhân 1.000đ)"
              >
                +000
              </button>
            )}
            {numValue < 10000000 && (!maxSuggestion || numValue * 1000000 <= maxSuggestion) && (
              <button
                type="button"
                onClick={() => multiplyAmount(1000000)}
                className="px-2.5 py-1.5 text-xs font-extrabold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
                title="Thêm 6 số 0 (Nhân 1.000.000đ)"
              >
                +000.000
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

