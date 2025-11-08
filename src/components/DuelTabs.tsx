import Box from '@mui/material/Box'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import useLanguage from '../i18n/useLanguage'

export type DuelValue = null | 'agree' | 'others'

type Props = {
  value: DuelValue
  onChange: (v: DuelValue) => void
  label?: string
  disabled?: boolean
}

// 讚同 / 其他 切換按鈕：
// - 兩顆按鈕等寬、佔滿一行，gap 16px
// - 點同一顆可切回預設（value=null）
export default function DuelTabs({ value, onChange, label, disabled }: Props) {
  const { t } = useLanguage()
  const agreeActive = value === 'agree'
  const othersActive = value === 'others'
  const toggle = (key: 'agree' | 'others') => {
    if (disabled) return
    onChange(value === key ? null : key)
  }
  return (
    <FormControl sx={{ display: 'flex', alignItems: 'stretch' }}>
      {label && (
        <FormLabel sx={{ mb: 1, textAlign: 'left', fontWeight: 700 }}>{label}</FormLabel>
      )}
      <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
        <button
          type="button"
          onClick={() => toggle('agree')}
          disabled={disabled}
          style={{
            borderRadius: 10,
            padding: '6px 12px',
            fontWeight: 700,
            border: '1px solid',
            borderColor: agreeActive ? '#10b981' : 'var(--mui-palette-divider)',
            color: agreeActive ? '#fff' : '#10b981',
            background: agreeActive ? '#10b981' : 'transparent',
            flex: 1,
            width: '100%',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
          }}
        >
          {t('points.add.stanceAgree') || '讚同'}
        </button>
        <button
          type="button"
          onClick={() => toggle('others')}
          disabled={disabled}
          style={{
            borderRadius: 10,
            padding: '6px 12px',
            fontWeight: 700,
            border: '1px solid',
            borderColor: othersActive ? '#ef4444' : 'var(--mui-palette-divider)',
            color: othersActive ? '#fff' : '#ef4444',
            background: othersActive ? '#ef4444' : 'transparent',
            flex: 1,
            width: '100%',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
          }}
        >
          {t('points.add.stanceOther') || '其他'}
        </button>
      </Box>
    </FormControl>
  )
}
