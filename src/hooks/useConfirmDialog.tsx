import { useCallback, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'

type Options = {
  title?: string
  confirmText?: string
  cancelText?: string
}

export default function useConfirmDialog() {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<Options>({})
  const [resolver, setResolver] = useState<(v: boolean) => void>(() => () => {})

  const confirm = useCallback((options?: Options) => {
    setOpts(options || {})
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve)
    })
  }, [])

  const handleCancel = useCallback(() => {
    setOpen(false)
    resolver(false)
  }, [resolver])

  const handleConfirm = useCallback(() => {
    setOpen(false)
    resolver(true)
  }, [resolver])

  const DialogEl = (
    <ConfirmDialog
      open={open}
      title={opts.title}
      confirmText={opts.confirmText}
      cancelText={opts.cancelText}
      onCancel={handleCancel}
      onConfirm={handleConfirm}
    />
  )

  return { confirm, ConfirmDialogEl: DialogEl }
}

