import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Skeleton from '@mui/material/Skeleton'
import Box from '@mui/material/Box'

export function TopicCardSkeleton() {
  return (
    <Card elevation={0} sx={{ borderRadius: '10px', border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: 2 }}>
        <Skeleton variant="text" width="60%" height={24} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="80%" height={16} />
        <Skeleton variant="text" width="40%" height={14} sx={{ mt: 1 }} />
      </CardContent>
    </Card>
  )
}

export function PointCardSkeleton() {
  return (
    <Card elevation={0} sx={{ borderRadius: '10px', border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton variant="text" width="90%" height={18} />
            <Skeleton variant="text" width="70%" height={18} />
            <Skeleton variant="text" width="30%" height={14} sx={{ mt: 1 }} />
          </Box>
          <Box sx={{ width: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Skeleton variant="circular" width={28} height={28} />
            <Skeleton variant="text" width={16} height={16} />
            <Skeleton variant="circular" width={28} height={28} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

