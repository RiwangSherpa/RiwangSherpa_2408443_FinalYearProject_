import { FormEvent, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import Button from './Button'

interface InputDialogProps {
  isOpen: boolean
  title: string
  description?: string
  inputLabel: string
  placeholder?: string
  defaultValue?: string
  confirmLabel: string
  cancelLabel?: string
  loading?: boolean
  validationError?: string
  maxLength?: number
  onConfirm: (value: string) => void
  onCancel: () => void
}

export default function InputDialog({
  isOpen,
  title,
  description,
  inputLabel,
  placeholder,
  defaultValue = '',
  confirmLabel,
  cancelLabel = 'Cancel',
  loading = false,
  validationError,
  maxLength,
  onConfirm,
  onCancel,
}: InputDialogProps) {
  const [value, setValue] = useState(defaultValue)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue)
      setLocalError('')
    }
  }, [defaultValue, isOpen])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) {
      setLocalError(`${inputLabel} is required.`)
      return
    }
    onConfirm(trimmed)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 p-4"
        >
          <motion.form
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-5 shadow-xl dark:border-dark-border-primary dark:bg-dark-bg-secondary"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-heading text-lg font-bold text-neutral-900 dark:text-dark-text-primary">
                  {title}
                </h2>
                {description && (
                  <p className="mt-2 text-sm text-neutral-500 dark:text-dark-text-secondary">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-50 dark:hover:bg-dark-bg-tertiary dark:hover:text-dark-text-primary"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-5 block text-sm font-medium text-neutral-800 dark:text-dark-text-primary">
              {inputLabel}
            </label>
            <input
              autoFocus
              value={value}
              maxLength={maxLength}
              onChange={(event) => {
                setValue(event.target.value)
                setLocalError('')
              }}
              placeholder={placeholder}
              disabled={loading}
              className="input-base mt-2"
            />
            {(localError || validationError) && (
              <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-300">
                {validationError || localError}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
                {cancelLabel}
              </Button>
              <Button type="submit" loading={loading}>
                {confirmLabel}
              </Button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
