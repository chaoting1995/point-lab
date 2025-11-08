import { Fragment, useEffect, useMemo, useState } from 'react'
import CountUp from 'react-countup'
import { getJson } from '../api/client'
import type { ItemResponse } from '../api/client'

type StatsOverview = {
  topics: number
  points: number
  comments: number
  visits: number
}

const fallbackStats: StatsOverview = { topics: 0, points: 0, comments: 0, visits: 0 }

export default function HeroStats() {
  const [stats, setStats] = useState<StatsOverview>(fallbackStats)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    getJson<ItemResponse<StatsOverview>>('/api/stats/overview')
      .then((resp) => {
        if (!mounted) return
        if (resp?.data) setStats(resp.data)
      })
      .catch(() => {
        if (!mounted) return
        setStats(fallbackStats)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const metrics = useMemo(
    () => [
      { key: 'topics', value: stats.topics, label: '個主題' },
      { key: 'points', value: stats.points, label: '個觀點' },
      { key: 'visits', value: stats.visits, label: '造訪人次' },
    ],
    [stats],
  )

  const rows = useMemo(() => {
    return metrics
  }, [metrics])

  return (
    <section className="hero-stats">
      <div className="hero-stats__inner">
        <div className="hero-stats__metrics">
          {rows.map((metric, idx) => (
            <Fragment key={metric.key}>
              <div className="hero-stats__metric">
                <div className="hero-stats__value" aria-live="polite">
                  {loading ? (
                    '—'
                  ) : (
                    <CountUp
                      end={metric.value || 0}
                      duration={1.4}
                      separator=","
                      preserveValue={false}
                      delay={0.1 * idx}
                    />
                  )}
                </div>
                <span className="hero-stats__label">{metric.label}</span>
              </div>
              {idx < rows.length - 1 && <span className="hero-stats__divider" aria-hidden="true" />}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  )
}
