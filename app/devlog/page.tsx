import type { Metadata } from 'next'
import { PostCard } from '@/components/site/post-card'
import { PageIntro, Section } from '@/components/site/primitives'
import { Reveal } from '@/components/site/reveal'
import { posts } from '@/lib/devlog'

export const metadata: Metadata = {
  title: 'Devlog',
  description: 'Notes from the FuzeNova workshop: updates, design thinking and patch notes.',
  alternates: { canonical: '/devlog' },
}

export default function DevlogPage() {
  return (
    <>
      <PageIntro eyebrow="Devlog" title="Notes from the workshop" intro="Updates, design thinking and what is coming next." />
      <Section className="pt-4 md:pt-4">
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p, i) => (
            <li key={p.slug}>
              <Reveal delay={i * 0.05} className="h-full">
                <PostCard post={p} />
              </Reveal>
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}
