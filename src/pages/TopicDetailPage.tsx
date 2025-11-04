import Header from '../components/Header'
import { useParams, useNavigate, Link } from 'react-router-dom'
import type { Topic } from '../data/topics'
import type { Point } from '../data/points'
import PointCard from '../components/PointCard'
import { getJson, type ItemResponse, type ListResponse } from '../api/client'
import { useEffect, useState } from 'react'
import useLanguage from '../i18n/useLanguage'
import PageHeader from '../components/PageHeader'
import Box from '@mui/material/Box'
import SortTabs from '../components/SortTabs'
import type { SortKey } from '../hooks/useSortTabs'
import { usePagedList } from '../hooks/usePagedList'
import PrimaryCtaButton from '../components/PrimaryCtaButton'
import { Plus } from 'phosphor-react'

export default function TopicDetailPage() {
  const { id = '' } = useParams()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [topic, setTopic] = useState<Topic | null>(null)
  const [list, setList] = useState<Point[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('new')

  // load topic meta
  useEffect(() => {
    let aborted = false
    async function run() {
      try {
        setLoading(true)
        setError(null)
        let topicData: Topic | null = null
        try {
          const topicResp = await getJson<ItemResponse<Topic>>(`/api/topics/id/${id}`)
          topicData = topicResp.data
        } catch {
          const list = await getJson<ListResponse<Topic>>('/api/topics')
          topicData = (list.items || []).find((t) => t.id === id || t.slug === id) || null
        }
        if (!aborted && topicData) setTopic(topicData)
      } catch (e) {
        if (!aborted) setError(e instanceof Error ? e.message : 'Load failed')
      } finally {
        if (!aborted) setLoading(false)
      }
    }
    run()
    return () => { aborted = true }
  }, [id])

  // simple first-page fetch for stability
  useEffect(() => {
    let aborted = false
    async function run() {
      try {
        setLoading(true)
        setError(null)
        const resp = await getJson<ListResponse<Point>>(`/api/points?topic=${id}&page=1&size=30&sort=${sort}`)
        if (aborted) return
        setList(resp.items || [])
      } catch (e) {
        if (!aborted) setError(e instanceof Error ? e.message : 'Load failed')
      } finally {
        if (!aborted) setLoading(false)
      }
    }
    run()
    return () => { aborted = true }
  }, [id, sort])
  const handleSort = (v: SortKey) => { setSort(v) }

  return (
    <div className="app">
      <Header />
      <main className="app__inner">
        {/* 移除左右重複 padding，僅保留上下間距，比照主題列表 */}
        <Box sx={{ px: 0, py: { xs: 1.5, md: 2 } }}>
          <PageHeader
            align="center"
            backButton
            onBack={() => navigate(-1)}
            title={topic ? topic.name : '主題'}
            subtitle={topic?.description}
          />

          <SortTabs value={sort} onChange={handleSort} />
          {loading && <p className="text-slate-500">{t('common.loading')}</p>}
          {error && <p className="text-rose-500">{t('common.error')}</p>}
          {list.length > 0 ? (
            <>
              {topic?.mode === 'duel' ? (
                // 600px (sm) 以下改為單欄；>=600px 兩欄
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <Box>
                    {list.filter((p) => p.position === 'agree').map((p) => (
                      <Box key={p.id} sx={{ mb: 2 }}>
                        <PointCard point={p} />
                      </Box>
                    ))}
                  </Box>
                  <Box>
                    {list.filter((p) => p.position === 'others').map((p) => (
                      <Box key={p.id} sx={{ mb: 2 }}>
                        <PointCard point={p} />
                      </Box>
                    ))}
                  </Box>
                </Box>
              ) : (
                <div className="hack-grid" role="tabpanel">
                  {list.map((hack) => (
                    <PointCard key={hack.id} point={hack} />
                  ))}
                </div>
              )}
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <p className="text-slate-500" style={{ fontSize: 14, margin: 0 }}>{t('points.footerPrompt') || '寫下你的洞見。無需註冊。'}</p>
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
                  <PrimaryCtaButton to={`/points/add?topic=${id}`} size="md" iconLeft={<Plus size={16} weight="bold" />}>
                    {t('header.cta')}
                  </PrimaryCtaButton>
                </Box>
              </Box>
            </>
          ) : (!loading && (
            <>
              <p className="text-center text-slate-500" style={{ fontSize: 14 }}>{t('points.empty') || '這裡是思維的荒蕪之地，建立第一個觀點。無需註冊。'}</p>
              <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
                <PrimaryCtaButton to={`/points/add?topic=${id}`} size="md" iconLeft={<Plus size={16} weight="bold" />}>
                  {t('header.cta')}
                </PrimaryCtaButton>
              </Box>
            </>
          ))}
        </Box>
      </main>
    </div>
  )
}
