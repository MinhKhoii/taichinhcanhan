import React from 'react';
import { getReadableVNDWords } from '../../utils/formatters';
import { Sparkles, RotateCcw } from 'lucide-react';

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    onChange(raw);
  };

  const setPreset = (val: number) => {
    onChange(val.toString());
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
          className="w-full px-3.5 py-2 text-base font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden tracking-tight"
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

      {/* Quick Suggestion Chips (Compact & Clean) */}
      {(presets.length > 0 || addChips.length > 0) && (
        <div className="space-y-1.5 pt-1">
          {/* Row 1: Common Presets */}
          {presets.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-slate-500 shrink-0">
                Mốc tiền:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {presets.map((p) => {
                  const isSelected = numValue === p.value;
                  return (
                    <button
                      type="button"
                      key={p.label}
                      onClick={() => setPreset(p.value)}
                      className={`px-2.5 py-0.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-bold'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Row 2: Additive Increment Chips */}
          {addChips.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-emerald-600 shrink-0">
                + Cộng dồn:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {addChips.map((c) => (
                  <button
                    type="button"
                    key={c.label}
                    onClick={() => addAmount(c.value)}
                    className="px-2.5 py-0.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all cursor-pointer active:scale-95"
                  >
                    {c.label.startsWith('+') ? c.label : `+${c.label}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

