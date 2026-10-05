import type { Metadata } from 'next'
import { PageIntro } from '@/components/site/primitives'
import { site } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'How FuzeNova Games handles your data.',
  alternates: { canonical: '/privacy' },
}

const sections = [
  { title: 'What we store', body: 'If you make an account, we store your email address, a securely hashed password and your game saves. Without an account, saves stay on your device.' },
  { title: 'Why', body: 'Only to sign you in and sync your progress between devices and games. We do not sell your data.' },
  { title: 'Contact form', body: 'Messages you send are used only to reply to you.' },
  { title: 'Deleting your data', body: `Email ${site.email} and we will delete your account and saves.` },
]

export default function PrivacyPage() {
  return (
    <>
      <PageIntro eyebrow="Privacy" title="Your data, kept simple" intro="Placeholder policy. Replace with your final wording before launch." />
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5 pb-24">
        {sections.map((s) => (
          <section key={s.title} className="flex flex-col gap-2">
            <h2 className="heading text-xl">{s.title}</h2>
            <p className="leading-relaxed text-muted">{s.body}</p>
          </section>
        ))}
      </div>
    </>
  )
}
