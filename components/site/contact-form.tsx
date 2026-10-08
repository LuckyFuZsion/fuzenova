'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Send } from 'lucide-react'
import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const topics = ['General', 'Bug report', 'Press', 'Collaboration'] as const

const schema = z.object({
  name: z.string().trim().min(1, 'Please tell us your name.').max(80),
  email: z.string().trim().email('Please enter a valid email address.'),
  topic: z.enum(topics),
  message: z.string().trim().min(10, 'A little more detail, please (10 characters or more).').max(2000),
})

type Values = z.infer<typeof schema>

export function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { topic: 'General' } })
  const honeypot = useRef<HTMLInputElement>(null)

  const onSubmit = async (values: Values) => {
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, website: honeypot.current?.value ?? '' }),
      })
      if (res.status === 429) {
        toast.error('You have sent a few messages already. Please try again a little later.')
        return
      }
      if (!res.ok) throw new Error(String(res.status))
      toast.success('Thanks! Your message has been sent.')
      reset()
    } catch {
      toast.error('Sorry, that did not send. Please try again, or email us directly.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="glass-card flex flex-col gap-5 p-6 md:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" id="name" error={errors.name?.message}>
          <input id="name" autoComplete="name" className="field" aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-error' : undefined} {...register('name')} />
        </Field>
        <Field label="Email" id="email" error={errors.email?.message}>
          <input id="email" type="email" autoComplete="email" className="field" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} {...register('email')} />
        </Field>
      </div>
      <Field label="Topic" id="topic" error={errors.topic?.message}>
        <select id="topic" className="field" {...register('topic')}>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Message" id="message" error={errors.message?.message}>
        <textarea id="message" rows={6} className="field resize-y" aria-invalid={!!errors.message} aria-describedby={errors.message ? 'message-error' : undefined} {...register('message')} />
      </Field>
      {/* Hidden from people; bots tend to fill every field. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Leave this empty</label>
        <input id="website" ref={honeypot} type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <button type="submit" disabled={isSubmitting} className="btn btn-gold self-start disabled:opacity-60">
        {isSubmitting ? 'Sending...' : 'Send message'} <Send className="size-4" aria-hidden="true" />
      </button>
    </form>
  )
}

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-ember">
          {error}
        </p>
      )}
    </div>
  )
}
