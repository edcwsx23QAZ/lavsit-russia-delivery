import { FurnitureProduct, CargoWithMetadata } from './furniture-types'

export function searchProducts(
  query: string,
  products: FurnitureProduct[]
): FurnitureProduct[] {
  if (!query.trim()) return []
  
  const lowerQuery = query.toLowerCase()
  return products.filter(product =>
    product.name?.toLowerCase().includes(lowerQuery)
  )
}

export function formatPrice(price: number | undefined): string {
  if (price === undefined || price === null) return '0 ₽'
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
  }).format(price)
}

export function getProductSummary(product: FurnitureProduct): string {
  return product.name || 'Без названия'
}

export function createCargosForProduct(
  product: FurnitureProduct,
  quantity: number
): CargoWithMetadata[] {
  // Минимальная реализация
  return []
}

export function removeCargosForProduct(
  cargos: CargoWithMetadata[],
  productId: string
): CargoWithMetadata[] {
  return cargos.filter(cargo => cargo.productId !== productId)
}

export function calculateTotalValue(products: any[]): number {
  return products.reduce((sum, product) => {
    return sum + (product.price || 0) * (product.quantity || 1)
  }, 0)
}

export function findCargoIndexesForProduct(
  cargos: CargoWithMetadata[],
  productId: string
): number[] {
  return cargos
    .map((cargo, index) => (cargo.productId === productId ? index : -1))
    .filter(index => index !== -1)
}

