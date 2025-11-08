import Header from '../components/Header'
import { useParams, useNavigate } from 'react-router-dom'
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
import PrimaryCtaButton from '../components/PrimaryCtaButton'
import { Plus } from 'phosphor-react'
import { PointCardSkeleton } from '../components/Skeletons'

export default function TopicDetailPage() {
  const { id = '' } = useParams()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [topic, setTopic] = useState<Topic | null>(null)
  const [list, setList] = useState<Point[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('new')
  // duel filter: null=預設（左右兩欄）、'agree' 或 'others' 單欄篩選
  const [duelFilter, setDuelFilter] = useState<null | 'agree' | 'others'>(null)
  // 穩定的查詢鍵：優先使用真正的 topicId（路由參數 id）
  const topicKey = encodeURIComponent(topic?.id || id)

  // load topic meta
  useEffect(() => {
    let aborted = false
    async function run() {
      try {
        setLoading(true)
        setError(null)
        let topicData: Topic | null = null
        const topicResp = await getJson<ItemResponse<Topic>>(`/api/topics/id/${id}`)
        topicData = topicResp.data
        if (!aborted && topicData) {
          setTopic(topicData)
          // 已移除 slug：路由必須是 id，無需再做轉向
        }
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
        const resp = await getJson<ListResponse<Point>>(`/api/points?topic=${topicKey}&page=1&size=30&sort=${sort}`)
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
  }, [topicKey, sort])
  const handleSort = (v: SortKey) => { setSort(v) }
  const toggleDuel = (key: 'agree' | 'others') => {
    setDuelFilter((prev) => (prev === key ? null : key))
  }

  return (
    <div className="app">
      <Header />
      <main className="app__inner">
        {/* 移除左右重複 padding，僅保留上下間距，比照主題列表 */}
        <Box sx={{ px: 0, py: { xs: 1.5, md: 2 } }}>
          <PageHeader
            align="center"
            backButton
            onBack={() => navigate('/topics')}
            title={topic ? topic.name : '主題'}
            subtitle={topic?.description}
          />

          <SortTabs value={sort} onChange={handleSort} />
          {loading && (
            <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <PointCardSkeleton key={i} />
              ))}
            </Box>
          )}
          {topic?.mode === 'duel' && !loading && (
            <Box sx={{ mt: 0.5, mb: 1, display: 'flex', gap: 2, width: '100%' }}>
              <Box
                component="button"
                type="button"
                onClick={() => toggleDuel('agree')}
                className="btn btn-sm"
                sx={(t)=>({
                  borderRadius: 2,
                  px: 1.5, py: 0.75,
                  fontWeight: 700,
                  border: '1px solid',
                  borderColor: duelFilter === 'agree' ? '#10b981' : t.palette.divider,
                  color: duelFilter === 'agree' ? '#fff' : '#10b981',
                  background: duelFilter === 'agree' ? '#10b981' : 'transparent',
                  flex: 1,
                  width: '100%',
                  cursor: 'pointer',
                })}
              >
                {t('points.add.stanceAgree') || '讚同'}
              </Box>
              <Box
                component="button"
                type="button"
                onClick={() => toggleDuel('others')}
                className="btn btn-sm"
                sx={(t)=>({
                  borderRadius: 2,
                  px: 1.5, py: 0.75,
                  fontWeight: 700,
                  border: '1px solid',
                  borderColor: duelFilter === 'others' ? '#ef4444' : t.palette.divider,
                  color: duelFilter === 'others' ? '#fff' : '#ef4444',
                  background: duelFilter === 'others' ? '#ef4444' : 'transparent',
                  flex: 1,
                  width: '100%',
                  cursor: 'pointer',
                })}
              >
                {t('points.add.stanceOther') || '其他'}
              </Box>
            </Box>
          )}
          {error && <p className="text-rose-500">{t('common.error')}</p>}
          {!loading && list.length > 0 ? (
            <>
              {topic?.mode === 'duel' ? (
                duelFilter
                ? (
                  <div className="point-grid" role="tabpanel">
                    {list.filter((p) => p.position === duelFilter).map((hack) => (
                      <PointCard key={hack.id} point={hack} onDeleted={(id) => setList((prev) => prev.filter((x) => x.id !== id))} />
                    ))}
                  </div>
                ) : (
                // 600px (sm) 以下改為單欄；>=600px 兩欄
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <Box>
                    {list.filter((p) => p.position === 'agree').map((p) => (
                      <Box key={p.id} sx={{ mb: 2 }}>
                        <PointCard point={p} onDeleted={(id) => setList((prev) => prev.filter((x) => x.id !== id))} />
                      </Box>
                    ))}
                  </Box>
                  <Box>
                    {list.filter((p) => p.position === 'others').map((p) => (
                      <Box key={p.id} sx={{ mb: 2 }}>
                        <PointCard point={p} onDeleted={(id) => setList((prev) => prev.filter((x) => x.id !== id))} />
                      </Box>
                    ))}
                  </Box>
                </Box>
                )
              ) : (
                <div className="point-grid" role="tabpanel">
                  {list.map((hack) => (
                    <PointCard key={hack.id} point={hack} onDeleted={(id) => setList((prev) => prev.filter((x) => x.id !== id))} />
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
