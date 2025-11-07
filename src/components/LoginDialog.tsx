import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import useLanguage from '../i18n/useLanguage'
import GoogleLogo from './icons/GoogleLogo'

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
        <Button
          onClick={async () => { await onLogin(); onClose() }}
          startIcon={<GoogleLogo size={16} />}
          sx={(theme)=>({
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 999,
            px: 2,
            py: 1,
            border: '1px solid',
            borderColor: theme.palette.primary.main + '20',
            backgroundColor: theme.palette.primary.main + '0A',
            color: theme.palette.text.primary,
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            '&:hover': {
              backgroundColor: theme.palette.primary.main + '14',
              borderColor: theme.palette.primary.main + '33',
              boxShadow: '0 6px 18px rgba(0,0,0,0.10)',
            },
            '&:active': {
              backgroundColor: theme.palette.primary.main + '1F',
            },
          })}
        >
          {t('auth.signInWithGoogle') || 'Sign in with Google'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
