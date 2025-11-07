import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import GoogleLoginButton from './GoogleLoginButton'
import Typography from '@mui/material/Typography'
import useLanguage from '../i18n/useLanguage'

export default function LoginDialog({ open, onClose, onLogin }: { open: boolean; onClose: () => void; onLogin: () => Promise<void> | void }) {
  const { t } = useLanguage()
  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ sx: { borderRadius: '10px', maxWidth: 300, mx: 'auto' } }}>
      <DialogTitle sx={{ fontWeight: 800, textAlign: 'center' }}>{t('auth.loginTitle') || '登入'}</DialogTitle>
      <DialogContent sx={{ textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          {t('auth.loginDesc') || '登入後，可參與排名、競賽'}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center' }}>
        <GoogleLoginButton onClick={async () => { await onLogin(); onClose() }} />
      </DialogActions>
    </Dialog>
  )
}
