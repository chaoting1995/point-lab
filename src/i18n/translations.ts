import { Converter } from 'opencc-js'

export type Locale = 'zh-Hant' | 'zh-Hans' | 'en'

type HeaderTranslation = {
  nav: {
    hot: string
    new: string
    top: string
  }
  cta: string
}

type LanguageToggleTranslation = {
  traditional: string
  simplified: string
  english: string
  ariaLabel: string
}

type HeroTranslation = {
  eyebrow: string
  title: string
  subtitle: string
  primaryAction: string
  secondaryAction: string
  badgeLabel: string
  badgeNote: string
  logos: string[]
}

type TabsTranslation = {
  hot: string
  new: string
  top: string
  hint: string
  old?: string
}

type ActionsTranslation = {
  upvote: string
  upvoted: string
  comments: string
  share: string
  copy: string
  copied: string
  posted: string
  publish?: string
  save?: string
}

type FooterTranslation = {
  discover: {
    title: string
    items: string[]
  }
  engage: {
    title: string
    items: string[]
  }
  about: {
    title: string
    intro: string
  }
}

export type AppTranslations = {
  header: HeaderTranslation
  languageToggle: LanguageToggleTranslation
  hero: HeroTranslation
  tabs: TabsTranslation
  actions: ActionsTranslation
  footer: FooterTranslation
  topics?: {
    add: {
      title: string
      subtitle: string
      nameLabel?: string
      namePlaceholder?: string
      descLabel?: string
      descPlaceholder?: string
      modeLabel?: string
      modeOpen?: string
      modeDuel?: string
      success?: string
      firstPrompt?: string
    }
    edit?: {
      title?: string
    }
    list?: {
      title: string
      subtitle: string
      subtitleA?: string
      subtitleB?: string
      subtitleC?: string
      ctaHighlight?: string
      ctaTail?: string
      add: string
      empty?: string
    }
    common?: {
      topicsBox: string
    }
  }
  points?: {
    add?: {
      title?: string
      subtitle?: string
      descLabel?: string
      descPlaceholder?: string
      nameLabel?: string
      namePlaceholder?: string
      stanceAgree?: string
      stanceOther?: string
      stanceLabel?: string
    }
    edit?: {
      title?: string
    }
    empty?: string
    footerPrompt?: string
  }
  guide?: {
    title: string
    subtitle: string
    card1: { title: string; body: string }
    card2: { title: string; body: string }
    card3: { title: string; body: string }
  }
  nav?: {
    home: string
    topics: string
    addTopic: string
    login?: string
    logout?: string
    guide?: string
  }
  common?: {
    loading: string
    error: string
    allLoaded?: string
    seeMore?: string
    seeLess?: string
    edit?: string
    delete?: string
    time?: {
      justNow: string
      hours: string // use {n}
      days: string // use {n}
    }
  }
}

const twToCn = Converter({ from: 'tw', to: 'cn' })

const baseZhHant: AppTranslations = {
  header: {
    nav: {
      hot: '熱門',
      new: '最新',
      top: 'Top 50',
    },
    cta: '新增觀點',
  },
  languageToggle: {
    traditional: '繁',
    simplified: '簡',
    english: 'EN',
    ariaLabel: '切換語言',
  },
  hero: {
    eyebrow: '',
    title: '觀點實驗室',
    subtitle:
      'PointLab 收整社群最愛的生活與工作觀點（Point），讓你幾分鐘內找到下一個能放進日常的靈感。',
    primaryAction: '開始探索',
    secondaryAction: '投稿新觀點',
    badgeLabel: 'Product Hunt 當日冠軍',
    badgeNote: '上線 48 小時內 3,200+ 票',
    logos: ['Product Hunt', 'Maker Stations', 'Indie Hackers'],
  },
  tabs: {
    hot: '熱門',
    new: '最新',
    top: 'Top 50 榜單',
    old: '最早',
    hint: '點選卡片就能複製連結、分享給夥伴一起挑戰。',
  },
  actions: {
    upvote: '我也要試',
    upvoted: '已收藏',
    comments: '回饋',
    share: '分享',
    copy: '複製連結',
    copied: '已複製',
    posted: '發布',
    publish: '發布',
    save: '儲存',
  },
  footer: {
    discover: {
      title: '探索',
      items: ['熱門觀點', '最新觀點', 'Top 50 榜單'],
    },
    engage: {
      title: '參與',
      items: ['投稿新觀點', '社群提案', '回報問題'],
    },
    about: {
      title: '關於 PointLab',
      intro: '我們是一群迷戀效率實驗的人，正在打造更有趣的習慣工具。',
    },
  },
  topics: {
    add: {
      title: '新增主題',
      subtitle: '主題、辯題、問題，建立任何你想探討的議題！',
      nameLabel: '主題名稱',
      namePlaceholder: '例如：什麼是「自由」？',
      descLabel: '主題描述（可選）',
      descPlaceholder: '簡要描述此主題',
      modeLabel: '主題模式',
      modeOpen: '開放式主題',
      modeDuel: '對立式主題',
      success: '主題已建立',
      firstPrompt: '這個主題空空如也，為主題添加第一個觀點吧！',
    },
    edit: { title: '編輯主題' },
    list: {
      title: '主題箱',
      subtitle: '探索你感興趣的主題 / 建立更多主題 / 無需註冊！',
      subtitleA: '探索你感興趣的主題',
      subtitleB: '建立更多主題',
      subtitleC: '無需註冊！',
      ctaHighlight: '建立',
      ctaTail: '更多主題，無需註冊！',
      add: '新增主題',
      empty: '尚無主題',
    },
    common: {
      topicsBox: '主題箱',
    },
  },
  points: {
    add: {
      title: '新增觀點',
      subtitle: '',
      descLabel: '你的觀點',
      descPlaceholder: '寫下你的觀點…',
      nameLabel: '訪客名稱',
      namePlaceholder: '例如：小明',
      stanceAgree: '讚同',
      stanceOther: '其他',
      stanceLabel: '選擇立場',
    },
    edit: { title: '編輯觀點' },
    empty: '這裡是思維的荒蕪之地，建立第一個觀點！\n無需註冊！',
    footerPrompt: '寫下你的洞見。無需註冊。',
  },
  nav: {
    home: '首頁',
    topics: '主題箱',
    addTopic: '新增主題',
    login: '登入',
    logout: '登出',
    guide: '指南',
  },
  common: {
    loading: '載入中…',
    error: '發生錯誤',
    allLoaded: '已抵達思想邊界',
    seeMore: '查看更多',
    seeLess: '查看更少',
    edit: '編輯',
    delete: '刪除',
    time: {
      justNow: '剛剛',
      hours: '{n} 小時前',
      days: '{n} 天前',
    },
  },
  guide: {
    title: '指南',
    subtitle: '撰寫觀點的小建議',
    card1: {
      title: '善用一句話，提煉好觀點',
      body:
        '如果一個概念，講清楚，要花三分鐘，能不能更短？\n' +
        '如果一個概念，講清楚，要花一分鐘，能不能只用「一句話」講清楚？\n' +
        '我們需要一段更鮮明的詮釋，一則濃縮後的標題，好讓人一聽就有印象。\n\n' +
        '如果只能說一句話，那會是哪句？\n' +
        '現代人注意力稀缺。好觀點，就從「一句話」開始！',
    },
    card2: {
      title: '觀點就像茶包，還需沖入熱水',
      body:
        '茶包直接含進嘴裡，就是苦澀的。好茶還需配好水。\n' +
        '有了那關鍵的一句話，再加上任何形式的佐證（推論、案例、數據、類比、名言...），就是一杯香氣四溢的好茶！',
    },
    card3: {
      title: '受眾就像小孩，一次只餵一口',
      body:
        '十小時的電影沒人會看，但只要把它拆成十集，就會有人熬夜看完。\n' +
        '表達也一樣。\n' +
        '好的表達，得像餵小孩子吃飯：一次一口，每次一小口。\n' +
        '內容太多，就試著拆成多個觀點表達吧！',
    },
  },
}

function convertToSimplified<T>(value: T): T {
  if (typeof value === 'string') {
    return twToCn(value) as T
  }
  if (Array.isArray(value)) {
    return value.map((item) => convertToSimplified(item)) as T
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, nested]) => [key, convertToSimplified(nested)],
    )
    return Object.fromEntries(entries) as T
  }
  return value
}

export const translations: Record<Locale, AppTranslations> = {
  'zh-Hant': baseZhHant,
  'zh-Hans': convertToSimplified(baseZhHant),
  // English falls back to zh-Hant for missing keys
  en: {
    ...baseZhHant,
    languageToggle: {
      traditional: '繁',
      simplified: '简',
      english: 'EN',
      ariaLabel: 'Switch language',
    },
    header: {
      nav: {
        hot: 'Hot',
        new: 'Newest',
        top: 'Top 50',
      },
      cta: 'New Point',
    },
    actions: {
      ...baseZhHant.actions,
      posted: 'Posted',
      publish: 'Publish',
      save: 'Save',
    },
    tabs: {
      hot: 'Hot',
      new: 'Newest',
      top: 'Top 50',
      old: 'Oldest',
      hint: baseZhHant.tabs.hint,
    },
    guide: {
      title: 'Guide',
      subtitle: 'Tips for writing points',
      card1: {
        title: 'Refine your point with one sentence',
        body:
          'If it takes three minutes to explain a concept clearly, can it be shorter?\n' +
          'If it takes one minute, can you explain it in just one sentence?\n' +
          'We need a sharper framing — a condensed headline that sticks.\n\n' +
          'If you could only say one sentence, what would it be?\n' +
          'Attention is scarce. Great points start from one sentence!',
      },
      card2: {
        title: 'A point is like a teabag — it needs hot water',
        body:
          'Putting a teabag straight in your mouth is bitter; good tea needs good water.\n' +
          'Once you have the key sentence, add any form of evidence (reasoning, cases, data, analogies, quotes...) and it becomes a fragrant cup of tea!',
      },
      card3: {
        title: 'Audience is like a child — one bite at a time',
        body:
          'No one watches a 10‑hour movie, but split into 10 episodes and people binge it overnight.\n' +
          'Expression works the same way.\n' +
          'Good delivery is like feeding a child: one bite at a time, small bites.\n' +
          'If there’s too much content, try splitting it into multiple points.',
      },
    },
    topics: {
      add: {
        title: 'Create Topic',
        subtitle: 'Topics, debates, questions — start any discussion you want!',
        nameLabel: 'Topic Title',
        namePlaceholder: 'e.g. What is “freedom”?',
        descLabel: 'Description (optional)',
        descPlaceholder: 'Describe this topic briefly',
        modeLabel: 'Topic Mode',
        modeOpen: 'Open',
        modeDuel: 'Oppositional',
        success: 'Topic created',
        firstPrompt: 'This topic is empty — add the first point!'
      },
      edit: { title: 'Edit Topic' },
      list: {
        title: 'Topics',
        subtitle: 'Tap a topic to view related points.',
        subtitleA: 'Explore topics you care about',
        ctaHighlight: 'Create',
        ctaTail: ' more topics, no signup needed!',
        add: 'New Topic',
        empty: 'No topics yet.',
      },
      common: {
        topicsBox: 'Topics',
      },
    },
    points: {
      add: {
        title: 'New Point',
        subtitle: '',
        descLabel: 'Your Point',
        descPlaceholder: 'Write your point…',
        nameLabel: 'Guest name',
        namePlaceholder: 'e.g. Alex',
        stanceAgree: 'Agree',
        stanceOther: 'Other',
        stanceLabel: 'Choose a position',
      },
      edit: { title: 'Edit Point' },
      empty: 'It\'s quiet here. Be the first to post a point — no signup needed.',
      footerPrompt: 'Share your insight. No signup needed.',
    },
    nav: {
      home: 'Home',
      topics: 'Topics',
      addTopic: 'New Topic',
      login: 'Sign in',
      logout: 'Sign out',
      guide: 'Guide',
    },
    common: {
      loading: 'Loading…',
      error: 'Something went wrong',
      allLoaded: 'All loaded',
      seeMore: 'See more',
      seeLess: 'See less',
      edit: 'Edit',
      delete: 'Delete',
      time: {
        justNow: 'a few seconds ago',
        hours: '{n} hours ago',
        days: '{n} days ago',
      },
    },
  },
}

function getNestedValue(
  tree: Record<string, unknown>,
  path: string[],
): unknown {
  return path.reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === 'object' && segment in acc) {
      return (acc as Record<string, unknown>)[segment]
    }
    return undefined
  }, tree)
}

export function translate(locale: Locale, keyPath: string): string {
  const pathSegments = keyPath.split('.')
  const raw =
    getNestedValue(translations[locale], pathSegments) ??
    getNestedValue(translations['zh-Hant'], pathSegments)
  return typeof raw === 'string' ? raw : keyPath
}
