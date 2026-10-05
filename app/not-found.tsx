import Link from 'next/link'
import { Emblem } from '@/components/site/emblem'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-6 px-5 text-center">
      <Emblem className="size-14" />
      <h1 className="heading text-4xl">Lost between worlds</h1>
      <p className="text-muted">That page does not exist. Let us get you somewhere brighter.</p>
      <Link href="/" className="btn btn-gold">
        Back home
      </Link>
    </div>
  )
}
