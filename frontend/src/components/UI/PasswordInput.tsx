import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  analyzePassword,
  generatePassword,
  getStrengthLabel,
  getStrengthColorClass,
  getStrengthTextClass,
  type PasswordAnalysis,
} from '@/lib/password-utils';

interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  accountName?: string;
  showStrengthIndicator?: boolean;
  showGenerator?: boolean;
  showSuggestions?: boolean;
  error?: string;
  onAnalysisChange?: (analysis: PasswordAnalysis) => void;
}

export default function PasswordInput({
  label = '密码',
  accountName = '',
  showStrengthIndicator = true,
  showGenerator = true,
  showSuggestions = true,
  error,
  value,
  onChange,
  className,
  onAnalysisChange,
  placeholder = '请输入密码',
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [genLength, setGenLength] = useState(16);
  const [genUppercase, setGenUppercase] = useState(true);
  const [genLowercase, setGenLowercase] = useState(true);
  const [genNumbers, setGenNumbers] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);
  const [copied, setCopied] = useState(false);

  const currentValue = typeof value === 'string' ? value : '';

  const analysis = useMemo(
    () => analyzePassword(currentValue, accountName),
    [currentValue, accountName]
  );

  useEffect(() => {
    onAnalysisChange?.(analysis);
  }, [analysis, onAnalysisChange]);

  const handleGenerate = useCallback(() => {
    const pwd = generatePassword(genLength, {
      uppercase: genUppercase,
      lowercase: genLowercase,
      numbers: genNumbers,
      symbols: genSymbols,
    });
    setGeneratedPassword(pwd);
  }, [genLength, genUppercase, genLowercase, genNumbers, genSymbols]);

  const handleUseGenerated = () => {
    if (generatedPassword && onChange) {
      const event = {
        target: { value: generatedPassword },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(event);
    }
    setGeneratorOpen(false);
  };

  const handleCopyGenerated = async () => {
    if (generatedPassword) {
      await navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (generatorOpen && !generatedPassword) {
      handleGenerate();
    }
  }, [generatorOpen, generatedPassword, handleGenerate]);

  const strengthPercent =
    analysis.strength === 'empty'
      ? 0
      : analysis.strength === 'weak'
        ? 33
        : analysis.strength === 'medium'
          ? 66
          : 100;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-rock-light-300 mb-2">
          {label}
        </label>
      )}

      <div className="relative">
        <KeyRound
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-rock-light-500"
        />
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={cn(
            'w-full pl-10 pr-24 py-3 bg-rock-dark-900/60 border rounded-lg text-white placeholder-rock-light-600 focus:outline-none focus:ring-1 transition-all duration-200 font-mono',
            error
              ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30'
              : analysis.isCommonPassword
                ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30'
                : 'border-rock-dark-600/50 focus:border-climbing-orange-500 focus:ring-climbing-orange-500/30',
            className
          )}
          {...props}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {showGenerator && (
            <button
              type="button"
              onClick={() => setGeneratorOpen(!generatorOpen)}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                generatorOpen
                  ? 'bg-climbing-orange-500/20 text-climbing-orange-500'
                  : 'text-rock-light-500 hover:text-rock-light-300 hover:bg-rock-dark-800'
              )}
              title="密码生成器"
            >
              <RefreshCw size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="p-1.5 rounded-md text-rock-light-500 hover:text-rock-light-300 hover:bg-rock-dark-800 transition-colors"
            title={showPassword ? '隐藏密码' : '显示密码'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {showStrengthIndicator && currentValue && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-rock-light-500">密码强度</span>
              <span
                className={cn(
                  'text-xs font-medium',
                  getStrengthTextClass(analysis.strength)
                )}
              >
                {getStrengthLabel(analysis.strength)}
              </span>
            </div>
            {analysis.isCommonPassword && (
              <div className="flex items-center gap-1 text-xs text-red-400">
                <AlertTriangle size={12} />
                <span>常见弱密码</span>
              </div>
            )}
          </div>
          <div className="w-full h-1.5 bg-rock-dark-700 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                getStrengthColorClass(analysis.strength)
              )}
              style={{ width: `${strengthPercent}%` }}
            />
          </div>
          <div className="flex gap-1 mt-1">
            {['weak', 'medium', 'strong'].map((level) => (
              <div
                key={level}
                className={cn(
                  'flex-1 h-0.5 rounded-full transition-all duration-300',
                  analysis.strength === 'empty'
                    ? 'bg-rock-dark-700'
                    : (level === 'weak' &&
                          (analysis.strength === 'weak' ||
                            analysis.strength === 'medium' ||
                            analysis.strength === 'strong')) ||
                        (level === 'medium' &&
                          (analysis.strength === 'medium' ||
                            analysis.strength === 'strong')) ||
                        (level === 'strong' && analysis.strength === 'strong')
                      ? getStrengthColorClass(level as 'weak' | 'medium' | 'strong')
                      : 'bg-rock-dark-700'
                )}
              />
            ))}
          </div>
        </div>
      )}

      {showSuggestions && analysis.suggestions.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {analysis.suggestions.slice(0, 3).map((suggestion, index) => (
            <div
              key={index}
              className="flex items-start gap-2 text-xs text-rock-light-400"
            >
              <AlertTriangle size={12} className="mt-0.5 flex-shrink-0 text-yellow-500" />
              <span>{suggestion}</span>
            </div>
          ))}
        </div>
      )}

      {showSuggestions &&
        currentValue &&
        analysis.strength === 'strong' &&
        analysis.suggestions.length === 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-green-400">
            <CheckCircle2 size={12} />
            <span>密码强度很好！</span>
          </div>
        )}

      {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}

      {generatorOpen && (
        <div className="mt-3 p-4 bg-rock-dark-900/80 border border-rock-dark-700 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">密码生成器</span>
            <button
              type="button"
              onClick={handleGenerate}
              className="flex items-center gap-1 text-xs text-climbing-orange-500 hover:text-climbing-orange-400 transition-colors"
            >
              <RefreshCw size={12} />
              重新生成
            </button>
          </div>

          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-rock-dark-800 rounded-lg text-sm text-green-400 font-mono break-all">
              {generatedPassword || '点击重新生成'}
            </code>
            <button
              type="button"
              onClick={handleCopyGenerated}
              className="p-2 text-rock-light-400 hover:text-white hover:bg-rock-dark-700 rounded-lg transition-colors"
              title="复制"
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-rock-light-400">密码长度</span>
                <span className="text-xs text-climbing-orange-500 font-medium">
                  {genLength}
                </span>
              </div>
              <input
                type="range"
                min="8"
                max="32"
                value={genLength}
                onChange={(e) => setGenLength(parseInt(e.target.value))}
                className="w-full h-1.5 bg-rock-dark-700 rounded-full appearance-none cursor-pointer accent-climbing-orange-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: '大写字母',
                  checked: genUppercase,
                  onChange: setGenUppercase,
                },
                {
                  label: '小写字母',
                  checked: genLowercase,
                  onChange: setGenLowercase,
                },
                { label: '数字', checked: genNumbers, onChange: setGenNumbers },
                {
                  label: '特殊符号',
                  checked: genSymbols,
                  onChange: setGenSymbols,
                },
              ].map(({ label, checked, onChange }) => (
                <label
                  key={label}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    className="w-4 h-4 rounded bg-rock-dark-800 border-rock-dark-600 text-climbing-orange-500 focus:ring-climbing-orange-500 focus:ring-offset-0"
                  />
                  <span className="text-xs text-rock-light-300">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleUseGenerated}
            disabled={!generatedPassword}
            className="w-full py-2 bg-climbing-orange-500 hover:bg-climbing-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            使用此密码
          </button>
        </div>
      )}
    </div>
  );
}
