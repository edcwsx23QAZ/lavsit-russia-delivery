// Типы данных для структурированного контента wiki

export interface WikiContact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  position?: string;
  notes?: string;
}

export interface WikiColumn {
  id: string;
  title?: string;
  content: string;
  contacts?: WikiContact[];
}

export interface WikiSection {
  id: string;
  title: string;
  content?: string;
  columns?: WikiColumn[];
  contacts?: WikiContact[];
  order: number;
}

export interface WikiStructuredContent {
  sections: WikiSection[];
}

// Функция для генерации уникальных ID
export const generateId = () => {
  return `wiki-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

