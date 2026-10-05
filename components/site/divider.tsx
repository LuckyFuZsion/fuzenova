import { cn } from '@/lib/utils'

export function Divider({ className }: { className?: string }) {
  return <div role="presentation" className={cn('element-divider', className)} />
}
