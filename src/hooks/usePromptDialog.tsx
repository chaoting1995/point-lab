import { useCallback, useState } from 'react'
import PromptDialog from '../components/PromptDialog'

type Options = {
  title?: string
  label?: string
  placeholder?: string
  confirmText?: string
  cancelText?: string
  defaultValue?: string
  required?: boolean
}

export default function usePromptDialog() {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<Options>({})
  const [resolver, setResolver] = useState<(v: string|null) => void>(() => () => {})

  const prompt = useCallback((options?: Options) => {
    setOpts(options || {})
    setOpen(true)
    return new Promise<string|null>((resolve) => {
      setResolver(() => resolve)
    })
  }, [])

  const handleCancel = useCallback(() => {
    setOpen(false)
    resolver(null)
  }, [resolver])

  const handleConfirm = useCallback((value: string) => {
    setOpen(false)
    resolver(value)
  }, [resolver])

  const DialogEl = (
    <PromptDialog
      open={open}
      title={opts.title}
      label={opts.label}
      placeholder={opts.placeholder}
      confirmText={opts.confirmText}
      cancelText={opts.cancelText}
      defaultValue={opts.defaultValue}
      required={opts.required}
      onCancel={handleCancel}
      onConfirm={handleConfirm}
    />
  )

  return { prompt, PromptDialogEl: DialogEl }
}

