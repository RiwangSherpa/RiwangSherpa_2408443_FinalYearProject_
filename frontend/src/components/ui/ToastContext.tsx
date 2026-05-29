import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import ToastContainer, { Toast } from './Toast'

type ToastInput = Omit<Toast, 'id'>

interface ToastContextValue {
  addToast: (toast: ToastInput | string, type?: Toast['type']) => string
  removeToast: (id: string) => void
  success: (message: string, title?: string) => string
  error: (message: string, title?: string) => string
  info: (message: string, title?: string) => string
  warning: (message: string, title?: string) => string
  achievement: (message: string, title?: string) => string
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

function createToastId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback((toast: ToastInput | string, type: Toast['type'] = 'info') => {
    const id = createToastId()
    const nextToast = typeof toast === 'string' ? { id, message: toast, type } : { id, ...toast }
    setToasts((current) => [...current, nextToast])
    return id
  }, [])

  const value = useMemo<ToastContextValue>(() => ({
    addToast,
    removeToast,
    success: (message, title) => addToast({ message, title, type: 'success' }),
    error: (message, title) => addToast({ message, title, type: 'error' }),
    info: (message, title) => addToast({ message, title, type: 'info' }),
    warning: (message, title) => addToast({ message, title, type: 'warning' }),
    achievement: (message, title = 'Achievement unlocked') =>
      addToast({ message, title, type: 'achievement', duration: 7000 }),
  }), [addToast, removeToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
