import { useEffect, useMemo, useRef, useState } from 'react'
import { LruCache } from './cache.ts'
import type { DisplayPreferences } from './preferences.ts'
import { quantizePixels } from './quantize.ts'

const CACHE = new LruCache<string>(48)

export interface AuthenticImageProps {
  source: string
  sourceIdentity?: string
  preferences: DisplayPreferences
  filter: boolean
  alt: string
  className?: string
  onError?: (message: string) => void
}

function cacheKey(source: string, identity: string | undefined, preferences: DisplayPreferences, width: number, height: number): string {
  return [identity ?? source.slice(0, 96), preferences.resolution, preferences.filterMode, width, height].join('|')
}

export function AuthenticImage({ source, sourceIdentity, preferences, filter, alt, className = '', onError }: AuthenticImageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const shouldFilter = filter
  const plainClass = useMemo(() => `authentic-image ${className}`.trim(), [className])

  useEffect(() => {
    if (!shouldFilter) return
    let cancelled = false
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => {
      if (cancelled) return
      const canvas = canvasRef.current
      if (canvas === null) return
      const maxDimension = preferences.resolution === 'classic' ? 256 : preferences.resolution === 'compact' ? 320 : preferences.resolution === 'standard' ? 416 : 512
      const ratio = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
      const width = Math.max(1, Math.round(image.naturalWidth * ratio))
      const height = Math.max(1, Math.round(image.naturalHeight * ratio))
      const key = cacheKey(source, sourceIdentity, preferences, width, height)
      const cached = CACHE.get(key)
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (context === null) return
      context.imageSmoothingEnabled = false
      if (cached !== undefined) {
        const cachedImage = new Image()
        cachedImage.onload = () => {
          if (!cancelled) context.drawImage(cachedImage, 0, 0, width, height)
        }
        cachedImage.src = cached
        return
      }
      context.drawImage(image, 0, 0, width, height)
      const pixels = context.getImageData(0, 0, width, height)
      const processed = quantizePixels(pixels, preferences.filterMode)
      context.putImageData(new ImageData(Uint8ClampedArray.from(processed.data), width, height), 0, 0)
      try { CACHE.set(key, canvas.toDataURL('image/png')) } catch { /* A tainted remote canvas remains viewable without caching. */ }
    }
    image.onerror = () => {
      if (cancelled) return
      const message = 'The image could not be decoded.'
      setFailed(message)
      onError?.(message)
    }
    image.src = source
    return () => { cancelled = true }
  }, [source, sourceIdentity, preferences.resolution, preferences.filterMode, shouldFilter, onError])

  if (failed !== null) return <div className="s7-inline-error">{failed}</div>
  if (!shouldFilter) return <img src={source} alt={alt} className={plainClass} draggable={false} />
  return <canvas ref={canvasRef} role="img" aria-label={alt} className={plainClass} />
}
