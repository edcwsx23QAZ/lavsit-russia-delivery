'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Package, Loader2, RefreshCw } from 'lucide-react';
import { FurnitureProduct, ProductSearchState } from '@/lib/furniture-types';
import { searchProducts, formatPrice, getProductSummary } from '@/lib/furniture-utils';

interface ProductSearchProps {
  onProductAdd: (product: FurnitureProduct) => void;
  disabled?: boolean;
}

export default function ProductSearch({ onProductAdd, disabled = false }: ProductSearchProps) {
  const [searchState, setSearchState] = useState<ProductSearchState>({
    query: '',
    isLoading: false,
    suggestions: [],
    showSuggestions: false,
    selectedIndex: -1
  });
  
  const [allProducts, setAllProducts] = useState<FurnitureProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Загрузка продуктов при монтировании
  useEffect(() => {
    loadProducts();
  }, []);
  
  // Загрузка продуктов с сервера (включая обновление кэша)
  const loadProducts = async (forceUpdate = false) => {
    setIsLoadingProducts(true);
    try {
      // Добавляем параметр для принудительного обновления кэша
      const url = forceUpdate 
        ? '/api/furniture-products?update=true' 
        : '/api/furniture-products';
        
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setAllProducts(data.data);
        console.log(`✅ Загружено ${data.data.length} товаров`);
        if (forceUpdate) {
          console.log('🔄 Принудительное обновление товарной матрицы завершено');
        }
      } else {
        console.error('❌ Ошибка загрузки товаров:', data.error);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки товаров:', error);
    } finally {
      setIsLoadingProducts(false);
    }
  };
  
  // Обработка поискового запроса
  const handleQueryChange = useCallback((query: string) => {
    setSearchState(prev => ({
      ...prev,
      query,
      selectedIndex: -1
    }));
    
    if (query.trim().length >= 2) {
      const filtered = searchProducts(allProducts, query);
      setSearchState(prev => ({
        ...prev,
        suggestions: filtered,
        showSuggestions: true
      }));
    } else {
      setSearchState(prev => ({
        ...prev,
        suggestions: [],
        showSuggestions: false
      }));
    }
  }, [allProducts]);
  
  // Обработка выбора товара
  const handleProductSelect = (product: FurnitureProduct) => {
    onProductAdd(product);
    setSearchState(prev => ({
      ...prev,
      query: '',
      suggestions: [],
      showSuggestions: false,
      selectedIndex: -1
    }));
    inputRef.current?.focus();
  };
  
  // Обработка клавиш
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!searchState.showSuggestions || searchState.suggestions.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSearchState(prev => ({
          ...prev,
          selectedIndex: Math.min(prev.selectedIndex + 1, prev.suggestions.length - 1)
        }));
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSearchState(prev => ({
          ...prev,
          selectedIndex: Math.max(prev.selectedIndex - 1, -1)
        }));
        break;
        
      case 'Enter':
        e.preventDefault();
        if (searchState.selectedIndex >= 0) {
          handleProductSelect(searchState.suggestions[searchState.selectedIndex]);
        }
        break;
        
      case 'Escape':
        setSearchState(prev => ({
          ...prev,
          showSuggestions: false,
          selectedIndex: -1
        }));
        break;
    }
  };
  
  // Закрытие списка при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setSearchState(prev => ({ ...prev, showSuggestions: false }));
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return (
    <div className="relative w-full">
      {/* Поле поиска */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={inputRef}
            type="text"
            value={searchState.query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (searchState.suggestions.length > 0) {
                setSearchState(prev => ({ ...prev, showSuggestions: true }));
              }
            }}
            placeholder="Поиск мебели по названию..."
            className="bg-gray-700 border-gray-600 text-white pl-10 h-10"
            disabled={disabled || isLoadingProducts}
          />
          {isLoadingProducts && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
          )}
        </div>
        
        <Button
          type="button"
          onClick={() => {
            if (searchState.selectedIndex >= 0) {
              handleProductSelect(searchState.suggestions[searchState.selectedIndex]);
            } else if (searchState.suggestions.length === 1) {
              handleProductSelect(searchState.suggestions[0]);
            }
          }}
          disabled={disabled || searchState.suggestions.length === 0}
          className="bg-blue-600 hover:bg-blue-700 h-10 px-4"
        >
          <Plus className="h-4 w-4 mr-2" />
          Добавить товар
        </Button>
        
        <Button
          type="button"
          onClick={() => loadProducts(true)}
          disabled={disabled || isLoadingProducts}
          variant="outline"
          className="h-10 px-4 border-gray-600 hover:bg-gray-700"
          title="Обновить товарную матрицу"
        >
          <RefreshCw className={`h-4 w-4 ${isLoadingProducts ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      {/* Список подсказок */}
      {searchState.showSuggestions && searchState.suggestions.length > 0 && (
        <Card 
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-gray-800 border-gray-600 max-h-80 overflow-y-auto"
        >
          <CardContent className="p-0">
            {searchState.suggestions.map((product, index) => (
              <div
                key={`${product.id}_${product.externalCode}`}
                onClick={() => handleProductSelect(product)}
                className={`p-3 cursor-pointer border-b border-gray-700 last:border-b-0 transition-colors ${
                  index === searchState.selectedIndex 
                    ? 'bg-blue-600/20 border-blue-500' 
                    : 'hover:bg-gray-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium text-sm truncate">
                      {product.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs border-gray-600">
                        {product.externalCode}
                      </Badge>
                      <div className="flex items-center text-gray-400 text-xs">
                        <Package className="h-3 w-3 mr-1" />
                        {getProductSummary(product)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-3">
                    <div className="text-green-400 font-medium text-sm">
                      {formatPrice(product.retailPrice)}
                    </div>
                    {!product.isActive && (
                      <Badge variant="destructive" className="text-xs mt-1">
                        Неактивен
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      
      {/* Состояние загрузки */}
      {isLoadingProducts && (
        <div className="text-gray-400 text-sm mt-2 flex items-center">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Загрузка каталога мебели...
        </div>
      )}
      
      {/* Пустой результат поиска */}
      {searchState.query.length >= 2 && searchState.suggestions.length === 0 && !isLoadingProducts && (
        <div className="text-gray-400 text-sm mt-2">
          Товары не найдены. Попробуйте изменить запрос.
        </div>
      )}
      
      {/* Подсказка */}
      {!searchState.query && allProducts.length > 0 && (
        <div className="text-gray-400 text-xs mt-2">
          Доступно {allProducts.length} товаров. Начните вводить название для поиска.
        </div>
      )}
    </div>
  );
}