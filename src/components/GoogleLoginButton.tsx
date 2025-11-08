import Button from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'
import type { SxProps, Theme } from '@mui/material/styles'
import GoogleLogo from './icons/GoogleLogo'
import useLanguage from '../i18n/useLanguage'
import { useState } from 'react'
import { createPortal } from 'react-dom'

export default function GoogleLoginButton({ onClick, sx }: { onClick: () => void | Promise<void>; sx?: SxProps<Theme> }) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (loading) return
    setLoading(true)
    try {
      await onClick()
    } catch (err) {
      setLoading(false)
      throw err
    }
  }

  return (
    <>
      {loading && typeof document !== 'undefined' &&
        createPortal(
          <LinearProgress
            color="primary"
            sx={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 4000, height: 4 }}
          />,
          document.body,
        )}
      <Button
        onClick={handleClick}
        disabled={loading}
        aria-busy={loading}
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
        {t('auth.signInWithGoogle')}
      </Button>
    </>
  )
}
