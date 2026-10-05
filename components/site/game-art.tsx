import Image from 'next/image'
import { assetExists } from '@/lib/assets'
import { ArtPlaceholder } from './art-placeholder'

type Props = {
  src: string
  alt: string
  from: string
  to: string
  glow: string
  className?: string
  sizes?: string
  priority?: boolean
  /** Default cover. Use contain for full portraits that must not be cropped. */
  fit?: 'cover' | 'contain'
}

export function GameArt({
  src,
  alt,
  from,
  to,
  glow,
  className,
  sizes = '(min-width: 1024px) 50vw, 100vw',
  priority,
  fit = 'cover',
}: Props) {
  if (assetExists(src)) {
    return (
      <div className={`relative overflow-hidden ${className ?? ''}`}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={fit === 'contain' ? 'object-contain' : 'object-cover'}
        />
      </div>
    )
  }
  return <ArtPlaceholder src={src} alt={alt} from={from} to={to} glow={glow} className={className} />
}
