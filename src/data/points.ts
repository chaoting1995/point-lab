export type Point = {
  id: string
  description: string
  createdAt?: string
  topicId?: string
  userId?: string
  position?: 'agree' | 'others'
  author?: {
    name: string
    role?: 'guest' | 'user' | string
  }
  upvotes?: number
  comments?: number
  shares?: number
  rank?: number
}

// 提供純型別定義；資料請從 API 取得：
// GET /api/points?topic=<id>&page=&size=&sort=new|hot|old|top
// GET /api/points/:id
