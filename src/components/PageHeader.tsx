import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import { CaretLeft } from 'phosphor-react'
import type { ReactNode } from 'react'

type Props = {
  title: ReactNode
  subtitle?: ReactNode
  align?: 'left' | 'center'
  extra?: ReactNode
  backButton?: boolean
  onBack?: () => void
  backAriaLabel?: string
  backDisabled?: boolean
}

export default function PageHeader({
  title,
  subtitle,
  align = 'left',
  extra,
  backButton,
  onBack,
  backAriaLabel = '返回上一頁',
  backDisabled = false,
}: Props) {
  const isCenter = align === 'center'
  if (isCenter) {
    return (
      <Box sx={{ mb: 2 }}>
        <Box
          sx={{
            display: 'grid',
            // 讓中間（標題）拿到最大寬度
            gridTemplateColumns: 'auto 1fr auto',
            alignItems: 'center',
            mb: subtitle ? 0.5 : 0,
            columnGap: 0,
          }}
        >
          <Box sx={{ justifySelf: 'start' }}>
            {backButton && (
              <IconButton aria-label={backAriaLabel} onClick={onBack} disabled={backDisabled} size="small" sx={{ borderRadius: '10px' }}>
                <CaretLeft size={18} />
              </IconButton>
            )}
          </Box>
          <Box sx={{ justifySelf: 'stretch', textAlign: 'center', minWidth: 0, mb: 1 }}>
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, m: 0, maxWidth: '100%', width: '100%', wordBreak: 'break-word' }}
            >
              {title}
            </Typography>
          </Box>
          <Box sx={{ justifySelf: 'end' }}>{extra}</Box>
        </Box>
        {subtitle && (
          <Box sx={{ color: 'text.secondary', textAlign: 'center', mt: 0, fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
            {typeof subtitle === 'string' ? <span>{subtitle}</span> : subtitle}
          </Box>
        )}
      </Box>
    )
  }

  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {backButton && (
          <IconButton aria-label={backAriaLabel} onClick={onBack} disabled={backDisabled} size="small" sx={{ borderRadius: '10px' }}>
            <CaretLeft size={18} />
          </IconButton>
        )}
        <Typography variant="h5" sx={{ fontWeight: 800, m: 0 }}>
          {title}
        </Typography>
        {subtitle && (
          <Box sx={{ color: 'text.secondary', mt: 0.5, fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
            {typeof subtitle === 'string' ? <span>{subtitle}</span> : subtitle}
          </Box>
        )}
      </Box>
      {extra && <Box sx={{ ml: 2 }}>{extra}</Box>}
    </Stack>
  )
}
