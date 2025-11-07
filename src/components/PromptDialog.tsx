import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import { useEffect, useState } from 'react'

export type PromptDialogProps = {
  open: boolean
  title?: string
  label?: string
  placeholder?: string
  confirmText?: string
  cancelText?: string
  defaultValue?: string
  required?: boolean
  onCancel: () => void
  onConfirm: (value: string) => void
}

export default function PromptDialog({
  open,
  title = '確定舉報？',
  label = '舉報原因（可選）',
  placeholder = '請補充原因（可留空）',
  confirmText = '送出',
  cancelText = '取消',
  defaultValue = '',
  required = false,
  onCancel,
  onConfirm,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue)
  useEffect(() => { if (open) setValue(defaultValue || '') }, [open, defaultValue])
  const disabled = required && !value.trim()
  return (
    <Dialog open={open} onClose={onCancel} PaperProps={{ sx: { width: '100%', maxWidth: 360, m: 1.5, borderRadius: '10px' } }}>
      <DialogTitle sx={{ textAlign: 'center', fontWeight: 800 }}>{title}</DialogTitle>
      <DialogContent sx={{ pt: 0, px: 2, pb: 0 }}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          label={label}
          placeholder={placeholder}
          value={value}
          onChange={(e)=> setValue(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 2, gap: 1 }}>
        <Button onClick={onCancel} variant="outlined" sx={(t)=>({ color: t.palette.text.secondary, borderColor: t.palette.divider, '&:hover': { borderColor: t.palette.text.disabled, bgcolor: t.palette.action.hover }, borderRadius: '10px', minWidth: 96 })}>
          {cancelText}
        </Button>
        <Button onClick={()=> onConfirm(value)} disabled={disabled} variant="contained" sx={(t)=>({ borderRadius: '10px', minWidth: 96, bgcolor: t.palette.primary.main, '&:hover': { bgcolor: t.palette.primary.dark } })}>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

