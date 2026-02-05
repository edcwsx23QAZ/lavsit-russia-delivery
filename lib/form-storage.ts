export function saveFormData(key: string, data: any): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      console.error('Error saving form data:', error)
    }
  }
}

export function loadFormData(key: string): any | null {
  if (typeof window !== 'undefined') {
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Error loading form data:', error)
      return null
    }
  }
  return null
}

export function hasStoredFormData(key: string): boolean {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(key) !== null
  }
  return false
}

export function createDebouncedSaver(
  key: string,
  delay: number = 500
): (data: any) => void {
  let timeoutId: NodeJS.Timeout | null = null
  
  return (data: any) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      saveFormData(key, data)
    }, delay)
  }
}

export function clearFormData(key: string): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Error clearing form data:', error)
    }
  }
}

