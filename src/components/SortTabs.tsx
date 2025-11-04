import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'
import { Flame, Sparkle, Clock } from 'phosphor-react'
import useLanguage from '../i18n/useLanguage'
import type { SortKey } from '../hooks/useSortTabs'

type Props = {
  value: SortKey
  onChange: (v: SortKey) => void
  fullWidth?: boolean
}

export default function SortTabs({ value, onChange, fullWidth = true }: Props) {
  const { t } = useLanguage()
  return (
    <Box sx={{ mt: 1, mb: 1, bgcolor: 'transparent', borderBottom: '1px solid #e5e7eb' }}>
      <Tabs
        value={value}
        onChange={(_, v) => onChange(v)}
        variant={fullWidth ? 'fullWidth' : 'standard'}
        aria-label="sort tabs"
        sx={{
          // Keep only the outer bottom border; ensure Tabs itself不產生額外底線
          '& .MuiTabs-scroller': { borderBottom: 'none' },
          '& .MuiTabs-flexContainer': { borderBottom: 'none' },
          '& .MuiTabs-indicator': { backgroundColor: '#4f46e5', height: 2, borderRadius: 1 },
          '& .MuiTab-root': {
            fontSize: 16,
            color: '#64748b',
            minHeight: 44,
            '&.Mui-selected': { color: '#4f46e5', fontWeight: 800 },
          },
        }}
      >
        <Tab value="new" label={t('tabs.new')} icon={<Sparkle size={16} />} iconPosition="start" />
        <Tab value="hot" label={t('tabs.hot')} icon={<Flame size={16} />} iconPosition="start" />
        <Tab value="old" label={t('tabs.old') || '最早'} icon={<Clock size={16} />} iconPosition="start" />
      </Tabs>
    </Box>
  )
}
