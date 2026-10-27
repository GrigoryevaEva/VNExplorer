export interface VndbImage {
  url: string
  thumbnail?: string
  dims?: [number, number]
}

export interface VisualNovelCard {
  id: string
  title: string
  released: string | null
  rating: number | null
  image: VndbImage | null
}

export interface VndbResponse<T> {
  results: T[]
  more: boolean
  count?: number
  stale?: boolean
  fetchedAt?: number
}

export interface VndbQuery {
  filters?: unknown[]
  fields: string
  sort?: string
  reverse?: boolean
  results?: number
  page?: number
  count?: boolean
}
