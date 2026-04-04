/**
 * Debounce utility to prevent API spam
 */

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => ReturnType<T> {
  let timeoutId: number | null = null

  return ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    return new Promise<ReturnType<T>>((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await func(...args)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }, delay)
    })
  }) as (...args: Parameters<T>) => ReturnType<T>
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0

  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      func(...args)
    }
  }
}
