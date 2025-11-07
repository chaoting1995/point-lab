import Button from '@mui/material/Button'
import type { SxProps, Theme } from '@mui/material/styles'
import GoogleLogo from './icons/GoogleLogo'
import useLanguage from '../i18n/useLanguage'

export default function GoogleLoginButton({ onClick, sx }: { onClick: () => void | Promise<void>; sx?: SxProps<Theme> }) {
  const { t } = useLanguage()
  return (
    <Button
      onClick={onClick}
      startIcon={<GoogleLogo size={16} />}
      sx={(theme)=>({
        textTransform: 'none',
        fontWeight: 700,
        borderRadius: 999,
        px: 2,
        py: 1,
        border: '1px solid',
        borderColor: (theme as any).palette?.primary?.main + '20',
        backgroundColor: (theme as any).palette?.primary?.main + '0A',
        color: (theme as any).palette?.text?.primary,
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        '&:hover': {
          backgroundColor: (theme as any).palette?.primary?.main + '14',
          borderColor: (theme as any).palette?.primary?.main + '33',
          boxShadow: '0 6px 18px rgba(0,0,0,0.10)',
        },
        '&:active': {
          backgroundColor: (theme as any).palette?.primary?.main + '1F',
        },
        ...sx as any,
      })}
    >
      {t('auth.signInWithGoogle') || '使用 Google 登入'}
    </Button>
  )
}

