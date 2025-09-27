// 🔧 Типы для интеграции мебельного каталога

export interface CargoPlace {
  placeNumber: number;
  weight: number; // кг
  height: number; // см
  depth: number;  // см (ширина в форме)
  length: number; // см
}

export interface FurnitureProduct {
  id: string;
  externalCode: string;
  name: string;
  retailPrice: number;
  isActive: boolean;
  cargoPlaces: CargoPlace[];
}

export interface ProductInForm {
  product: FurnitureProduct;
  quantity: number;
  totalPrice: number;
  cargoIndexes: number[]; // индексы соответствующих мест в form.cargos
  addedAt: number; // timestamp для уникальности
}

export interface ProductSearchState {
  query: string;
  isLoading: boolean;
  suggestions: FurnitureProduct[];
  showSuggestions: boolean;
  selectedIndex: number;
}

// Расширение существующего интерфейса Cargo
export interface CargoWithMetadata {
  id: string;
  length: number;
  width: number;  // в форме это width, в данных depth
  height: number;
  weight: number;
  // Метаданные для связи с товарами
  productId?: string;
  placeNumber?: number;
  isFromProduct?: boolean;
  addedAt?: number; // timestamp добавления товара для надежной связи
}

// Утилиты для работы с данными
export interface FurnitureDataUtils {
  // Преобразование CargoPlace в Cargo для формы
  cargoPlaceToFormCargo: (place: CargoPlace, productId: string, uniqueId: string) => CargoWithMetadata;
  
  // Поиск товаров
  searchProducts: (products: FurnitureProduct[], query: string) => FurnitureProduct[];
  
  // Валидация товара
  validateProduct: (product: FurnitureProduct) => { isValid: boolean; errors: string[] };
  
  // Расчет общей стоимости
  calculateTotalValue: (productsInForm: ProductInForm[]) => number;
}