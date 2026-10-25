import React, { useEffect, useState } from 'react';
import { Delete, KeyRound, Lock, ShieldAlert } from 'lucide-react';

interface Props {
  isLocked: boolean;
  onUnlock: (pin: string) => boolean;
  onForgotPin?: () => void;
  babyName?: string;
}

export const PinLockScreen: React.FC<Props> = ({
  isLocked,
  onUnlock,
  onForgotPin,
  babyName,
}) => {
  const [pin, setPin] = useState('');
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!isLocked) {
      setPin('');
      setIsError(false);
      setErrorMessage('');
      setAttempts(0);
      return;
    }

    // Keyboard physical listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter') {
        if (pin.length >= 4) {
          verify(pin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, pin]);

  if (!isLocked) return null;

  const handleDigit = (digit: string) => {
    if (pin.length >= 6) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setIsError(false);

    // Auto verify if reaching 4 or 6 digits
    if (nextPin.length >= 4) {
      // Check if matches
      setTimeout(() => {
        verify(nextPin);
      }, 100);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setIsError(false);
  };

  const handleClear = () => {
    setPin('');
    setIsError(false);
  };

  const verify = (code: string) => {
    const success = onUnlock(code);
    if (!success) {
      setIsError(true);
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setErrorMessage(
        nextAttempts >= 3
          ? `密碼不正確 (已嘗試 ${nextAttempts} 次，若忘記可選擇重設)`
          : '安全密碼錯誤，請重新輸入'
      );
      setTimeout(() => {
        setPin('');
      }, 400);
    }
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-stone-900/95 dark:bg-slate-950/98 backdrop-blur-2xl p-4 select-none">
      <div className="w-full max-w-sm rounded-3xl border border-stone-700/60 dark:border-slate-800 bg-stone-900/90 dark:bg-slate-900/90 p-8 shadow-2xl flex flex-col items-center text-center">
        {/* Lock Icon */}
        <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-lg">
          <Lock className="w-8 h-8" />
          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-white shadow-sm">
            <KeyRound className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="mb-1 text-center select-none">
          {babyName ? (
            <h2 className="text-xl font-bold tracking-tight text-white">{babyName} 的帳本已上鎖</h2>
          ) : (
            <div className="flex flex-col items-center leading-tight">
              <span className="text-lg font-extrabold text-white tracking-widest">萌寶</span>
              <span className="text-lg font-extrabold text-amber-400 tracking-widest mt-0.5">記帳</span>
            </div>
          )}
        </div>
        <p className="text-xs text-stone-400 mb-6">
          已啟用資訊安全防護，請輸入 4~6 位數 PIN 碼以解鎖
        </p>

        {/* PIN Dots */}
        <div
          className={`flex items-center justify-center gap-3.5 mb-3 transition-transform ${
            isError ? 'animate-shake' : ''
          }`}
        >
          {[0, 1, 2, 3, 4, 5].map(idx => {
            const hasDigit = idx < pin.length;
            return (
              <div
                key={idx}
                className={`h-4 w-4 rounded-full border-2 transition-all duration-150 ${
                  hasDigit
                    ? isError
                      ? 'bg-rose-500 border-rose-500 scale-110'
                      : 'bg-amber-400 border-amber-400 scale-110 shadow-sm shadow-amber-400/50'
                    : 'border-stone-600 dark:border-slate-700 bg-stone-800/40'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        <div className="h-6 mb-4 flex items-center justify-center">
          {errorMessage && (
            <span className="text-xs font-semibold text-rose-400 flex items-center gap-1 animate-in fade-in duration-200">
              <ShieldAlert className="w-3.5 h-3.5" />
              {errorMessage}
            </span>
          )}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] mb-5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="h-14 rounded-2xl border border-stone-700/60 dark:border-slate-800 bg-stone-800/70 hover:bg-stone-700/80 active:bg-amber-600 active:text-white text-lg font-bold font-mono text-white transition-all duration-100 flex items-center justify-center shadow-sm"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 rounded-2xl border border-stone-800/80 bg-stone-900/60 hover:bg-stone-800 text-xs font-semibold text-stone-400 hover:text-white transition-colors flex items-center justify-center"
          >
            清除
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl border border-stone-700/60 dark:border-slate-800 bg-stone-800/70 hover:bg-stone-700/80 active:bg-amber-600 active:text-white text-lg font-bold font-mono text-white transition-all duration-100 flex items-center justify-center shadow-sm"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl border border-stone-800/80 bg-stone-900/60 hover:bg-stone-800 text-stone-400 hover:text-white transition-colors flex items-center justify-center"
            title="刪除上一位"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Forgot PIN / Emergency Reset */}
        {onForgotPin && (
          <button
            type="button"
            onClick={onForgotPin}
            className="text-xs text-stone-400 hover:text-amber-400 transition-colors underline underline-offset-4"
          >
            忘記 PIN 密碼？
          </button>
        )}
      </div>
    </div>
  );
};
