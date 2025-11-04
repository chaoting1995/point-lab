export type Topic = {
  id: string
  name: string
  description?: string
  slug: string
  count?: number
  tag: string // 用於對應觀點的主標籤（不做語系轉換）
  score?: number // 可為負數
  createdAt?: string
  mode?: 'open' | 'duel'
}

export const topics: Topic[] = []
