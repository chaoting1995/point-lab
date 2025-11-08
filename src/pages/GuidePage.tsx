import Header from '../components/Header'
import PageHeader from '../components/PageHeader'
import Footer from '../components/Footer'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import useLanguage from '../i18n/useLanguage'

export default function GuidePage() {
  const { t } = useLanguage()
  return (
    <div className="app">
      <Header />
      <main className="app__inner">
        <Box sx={{ p: { xs: 1.5, md: 2 } }}>
          <PageHeader align="center" title={t('guide.title') || '指南'} subtitle={t('guide.subtitle') || '撰寫觀點的小建議'} />
          
          <Box sx={{ mt: 2 }}>
            <div
              className="card bg-base-100 shadow-sm"
              style={{ borderRadius: 10, background: '#ffffff', border: 'none', boxShadow: '0 1px 4px rgba(15,35,95,0.06)' }}
            >
              <div className="card-body" style={{ padding: 16 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                  {t('guide.card1.title') || '善用一句話，提煉好觀點'}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                  {t('guide.card1.body')}
                </Typography>
              </div>
            </div>

            <div
              className="card bg-base-100 shadow-sm"
              style={{ borderRadius: 10, background: '#ffffff', border: 'none', boxShadow: '0 1px 4px rgba(15,35,95,0.06)', marginTop: 12 }}
            >
              <div className="card-body" style={{ padding: 16 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                  {t('guide.card2.title') || '觀點就像茶包，還需沖入熱水'}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#334155' }}>
                  {t('guide.card2.body')}
                </Typography>
              </div>
            </div>

            <div
              className="card bg-base-100 shadow-sm"
              style={{ borderRadius: 10, background: '#ffffff', border: 'none', boxShadow: '0 1px 4px rgba(15,35,95,0.06)', marginTop: 12 }}
            >
              <div className="card-body" style={{ padding: 16 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                  {t('guide.card3.title') || '內容太多，就拆成多個觀點表達'}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#334155' }}>
                  {t('guide.card3.body')}
                </Typography>
              </div>
            </div>
          </Box>
        </Box>
      </main>
      <Footer />
    </div>
  )
}
