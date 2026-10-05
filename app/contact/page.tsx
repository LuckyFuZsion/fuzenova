import { Mail } from 'lucide-react'
import type { Metadata } from 'next'
import { ContactForm } from '@/components/site/contact-form'
import { PageIntro, Section } from '@/components/site/primitives'
import { site } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with FuzeNova Games about bugs, press or anything else.',
  alternates: { canonical: '/contact' },
}

export default function ContactPage() {
  return (
    <>
      <PageIntro eyebrow="Contact" title="Get in touch" intro="Bug reports, press, ideas or just hello. Every message is read by a real person." />
      <Section className="pt-4 md:pt-4">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="glass-card p-6 md:p-8">
            <ContactForm />
          </div>
          <aside className="flex flex-col gap-4">
            <a href={`mailto:${site.email}`} className="glass-card flex items-center gap-4 p-6 hover:border-dawn/50">
              <Mail className="size-5 text-dawn" aria-hidden="true" />
              <span>
                <span className="block font-bold">Email</span>
                <span className="text-muted">{site.email}</span>
              </span>
            </a>
          </aside>
        </div>
      </Section>
    </>
  )
}
