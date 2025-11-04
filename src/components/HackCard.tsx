import { useMemo, useState } from 'react'
import useLanguage from '../i18n/useLanguage'
import type { Hack } from '../data/hacks'
import { mapHackToLocale } from '../data/hacks'

type LocalisedHack = ReturnType<typeof mapHackToLocale>

function getInitials(name: string) {
  if (!name) return 'P'
  const trimmed = name.trim()
  if (trimmed.length <= 2) return trimmed
  return trimmed.slice(0, 2)
}

function getShareUrl(id: string) {
  if (typeof window === 'undefined') {
    return `https://pointlab.co/points/${id}`
  }
  const { origin, pathname } = window.location
  return `${origin}${pathname}#${id}`
}

export function HackCard({ hack }: { hack: LocalisedHack }) {
  const { t } = useLanguage()
  const [upvoted, setUpvoted] = useState(false)
  const [voteCount, setVoteCount] = useState(hack.upvotes)
  const [copied, setCopied] = useState(false)

  const rankLabel = useMemo(() => {
    if (hack.rank <= 3) {
      return (
        <span className="hack-card__rank is-top">
          <span role="img" aria-label="top rank">
            🔥
          </span>
          #{hack.rank}
        </span>
      )
    }
    return <span className="hack-card__rank">#{hack.rank}</span>
  }, [hack.rank])

  const avatarInitials = useMemo(() => getInitials(hack.author.name), [hack.author.name])

  const shareUrl = useMemo(() => getShareUrl(hack.id), [hack.id])

  const handleUpvote = () => {
    setUpvoted((current) => {
      const next = !current
      setVoteCount((prev) => prev + (next ? 1 : -1))
      return next
    })
  }

  const handleShare = async () => {
    const payload = {
      title: 'PointLab Point',
      text: hack.description,
      url: shareUrl,
    }
    try {
      if (navigator.share) {
        await navigator.share(payload)
      } else {
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1600)
      }
    } catch (error) {
      console.warn('Share failed', error)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch (error) {
      console.warn('Copy failed', error)
    }
  }

  return (
    <article className="hack-card card bg-base-100 shadow-md border border-slate-200" id={hack.id} aria-label={`Point ${hack.rank}`}>
      <div className="card-body gap-4">
      <div className="hack-card__meta">
        {rankLabel}
        <div className="hack-card__author">
          <span className="hack-card__avatar">{avatarInitials}</span>
          <div>
            <div style={{ fontWeight: 700 }}>{hack.author.name}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {hack.author.role === 'user'
                ? '登入用戶'
                : hack.author.role === 'guest'
                ? '訪客'
                : hack.author.role}
            </div>
          </div>
        </div>
      </div>

      <p className="hack-card__body">{hack.description}</p>

      <div className="hack-card__tags">
        {hack.hashtags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>

      <div className="hack-card__actions">
        <div className="hack-card__stats">
          <span className="hack-card__stat">
            <span aria-hidden="true">⬆</span>
            {voteCount}
          </span>
          <span className="hack-card__stat">
            <span aria-hidden="true">💬</span>
            {hack.comments}
          </span>
          <span className="hack-card__stat">
            <span aria-hidden="true">🔗</span>
            {hack.shares}
          </span>
        </div>

        <div className="hack-card__buttons">
          <button
            type="button"
            className={`hack-card__button btn btn-sm ${upvoted ? 'btn-primary' : 'btn-ghost'}`}
            onClick={handleUpvote}
            aria-pressed={upvoted}
          >
            <span aria-hidden="true">{upvoted ? '🧪' : '✨'}</span>
            {upvoted ? t('actions.upvoted') : t('actions.upvote')}
          </button>
          <button
            type="button"
            className="hack-card__button btn btn-sm btn-ghost"
            onClick={handleShare}
          >
            <span aria-hidden="true">📣</span>
            {t('actions.share')}
          </button>
          <button
            type="button"
            className="hack-card__button btn btn-sm btn-ghost"
            onClick={handleCopy}
          >
            <span aria-hidden="true">📋</span>
            {copied ? t('actions.copied') : t('actions.copy')}
          </button>
        </div>
      </div>

      <span className="hack-card__timestamp">
        <span aria-hidden="true">🗓</span>
        {t('actions.posted')} {hack.postedAtLabel}
      </span>
      </div>
    </article>
  )
}

export function HackCardPresenter({ hack }: { hack: Hack }) {
  const { locale } = useLanguage()
  const localised = useMemo(() => mapHackToLocale(hack, locale), [hack, locale])
  return <HackCard hack={localised} />
}

export default HackCardPresenter
