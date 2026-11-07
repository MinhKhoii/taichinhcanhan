import React from 'react';
import { getReadableVNDWords, getSmartAmountSuggestions, parseQuickAmountInput } from '../../utils/formatters';
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
}) => {
  const numValue = parseInt(value.replace(/[^0-9]/g, '') || '0', 10);
  const readableWords = getReadableVNDWords(numValue);
  const smartSuggestions = getSmartAmountSuggestions(numValue);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const quickParsed = parseQuickAmountInput(rawVal);
    if (quickParsed !== null && (rawVal.toLowerCase().includes('k') || rawVal.toLowerCase().includes('tr') || rawVal.toLowerCase().includes('m'))) {
      onChange(quickParsed.toString());
      return;
    }

    const raw = rawVal.replace(/[^0-9]/g, '');
    onChange(raw);
  };

  const setPreset = (val: number) => {
    onChange(val.toString());
  };

  const multiplyAmount = (factor: number) => {
    if (numValue > 0) {
      onChange((numValue * factor).toString());
    }
  };

  const addAmount = (val: number) => {
    onChange((numValue + val).toString());
  };

  const resetAmount = () => {
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
        <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-blue-50/70 border border-blue-100 rounded-lg text-xs font-semibold text-blue-700 animate-in fade-in duration-150">
          <Sparkles className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
          <span className="break-words leading-tight">{readableWords}</span>
        </div>
      )}

      {/* SMART BANKING SUGGESTIONS */}
      <div className="space-y-1.5 pt-1">
        {/* Smart dynamic suggestions based on typed number */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-3xs font-bold text-slate-500 flex items-center space-x-0.5">
            <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span>{numValue > 0 ? `Gợi ý theo "${numValue.toLocaleString('vi-VN')}":` : 'Mốc tiền:'}</span>
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            {smartSuggestions.map((item) => {
              const isSelected = numValue === item.amount;
              return (
                <button
                  type="button"
                  key={item.amount}
                  onClick={() => setPreset(item.amount)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-2xs active:scale-95 ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-1 ring-blue-500'
                      : 'bg-white hover:bg-blue-50 text-blue-700 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Multipliers (+000, +000.000) & Additive Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          {numValue > 0 && numValue < 10000000 && (
            <>
              <button
                type="button"
                onClick={() => multiplyAmount(1000)}
                className="px-2 py-0.5 text-2xs font-extrabold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-all shadow-2xs active:scale-95 cursor-pointer"
                title="Nhân 1.000 (Thêm 3 số 0)"
              >
                +000
              </button>
              <button
                type="button"
                onClick={() => multiplyAmount(1000000)}
                className="px-2 py-0.5 text-2xs font-extrabold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg transition-all shadow-2xs active:scale-95 cursor-pointer"
                title="Nhân 1.000.000 (Thêm 6 số 0)"
              >
                +000.000
              </button>
            </>
          )}
          {addChips.map((c) => (
            <button
              type="button"
              key={c.label}
              onClick={() => addAmount(c.value)}
              className="px-2 py-0.5 text-2xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all cursor-pointer active:scale-95"
            >
              {c.label.startsWith('+') ? c.label : `+${c.label}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

