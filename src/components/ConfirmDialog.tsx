import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'

export type ConfirmDialogProps = {
  open: boolean
  title?: string
  confirmText?: string
  cancelText?: string
  onCancel: () => void
  onConfirm: () => void
}

export default function ConfirmDialog({
  open,
  title = '確定刪除？',
  confirmText = '確認',
  cancelText = '取消',
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      PaperProps={{
        sx: {
          width: '100%',
          maxWidth: 300,
          m: 1.5,
          borderRadius: '10px',
        },
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', fontWeight: 800 }}>{title}</DialogTitle>
      <DialogActions sx={{ justifyContent: 'center', pb: 2, gap: 1 }}>
        <Button
          onClick={onCancel}
          variant="outlined"
          sx={{
            color: '#64748b',
            borderColor: '#cbd5e1',
            '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
            borderRadius: '10px',
            minWidth: 96,
          }}
        >
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          sx={{
            borderRadius: '10px',
            minWidth: 96,
            bgcolor: '#4f46e5',
            '&:hover': { bgcolor: '#4338ca' },
          }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
