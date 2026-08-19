export class LruCache<Value> {
  private values = new Map<string, Value>()

  constructor(private readonly capacity = 48) {}

  get(key: string): Value | undefined {
    const value = this.values.get(key)
    if (value === undefined) return undefined
    this.values.delete(key)
    this.values.set(key, value)
    return value
  }

  set(key: string, value: Value): void {
    this.values.delete(key)
    this.values.set(key, value)
    while (this.values.size > this.capacity) {
      const oldest = this.values.keys().next().value as string | undefined
      if (oldest === undefined) break
      this.values.delete(oldest)
    }
  }

  clear(): void {
    this.values.clear()
  }

  get size(): number {
    return this.values.size
  }
}
