'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Send } from 'lucide-react'
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

  const onSubmit = async () => {
    await new Promise((r) => setTimeout(r, 400))
    toast.success('Thanks! Your message is on its way.')
    reset()
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
