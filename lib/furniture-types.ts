export interface FurnitureProduct {
  id: string
  name: string
  price?: number
  [key: string]: any
}

export interface ProductInForm {
  id: string
  name: string
  quantity: number
  [key: string]: any
}

export interface CargoWithMetadata {
  id: string
  length: number
  width: number
  height: number
  weight: number
  productId?: string
  placeNumber?: number
  isFromProduct?: boolean
  addedAt?: number
  [key: string]: any
}

export interface ProductSearchState {
  query: string
  isLoading: boolean
  suggestions: FurnitureProduct[]
  showSuggestions: boolean
  selectedIndex: number
}

