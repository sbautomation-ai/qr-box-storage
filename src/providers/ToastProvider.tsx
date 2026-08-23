import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, CircleAlert, X } from 'lucide-react'

type Toast = { id: number; message: string; tone: 'success' | 'error' }
type ToastContextValue = { showToast: (message: string, tone?: Toast['tone']) => void }
const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), [])
  const showToast = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current, { id, message, tone }])
    window.setTimeout(() => dismiss(id), 4500)
  }, [dismiss])
  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`flex items-start gap-3 rounded-xl border p-4 shadow-2xl ${toast.tone === 'error' ? 'border-red-900 bg-red-950 text-red-100' : 'border-emerald-900 bg-emerald-950 text-emerald-100'}`}>
            {toast.tone === 'error' ? <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />}
            <p className="flex-1 text-sm">{toast.message}</p>
            <button onClick={() => dismiss(toast.id)} aria-label="Dismiss notification"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
