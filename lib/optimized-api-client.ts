import { cacheManager } from './cache-manager'

class OptimizedApiClient {
  async request(url: string, options: RequestInit = {}): Promise<any> {
    const cacheKey = `${url}:${JSON.stringify(options)}`
    const cached = cacheManager.get(cacheKey)
    
    if (cached) {
      return cached
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`)
      }

      const data = await response.json()
      cacheManager.set(cacheKey, data, 60000) // 1 minute cache
      return data
    } catch (error) {
      console.error('API request error:', error)
      throw error
    }
  }
}

export const optimizedApiClient = new OptimizedApiClient()

