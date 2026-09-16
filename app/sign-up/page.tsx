'use client'

import { FormEvent, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const result = await authClient.signUp.email({ name, email, password })
    if (result.error) {
      setError('Unable to create the account. Check the details and try again.')
      return
    }
    router.push('/admin')
    router.refresh()
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <p className="eyebrow">Sahten Food</p>
        <h1>Create account</h1>
        <label>Name<input className="field" value={name} onChange={(event) => setName(event.target.value)} required /></label>
        <label>Email<input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label>Password<input className="field" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        {error && <p role="alert" className="error">{error}</p>}
        <button className="button primary full" type="submit">Create account</button>
        <p className="auth-help">After creating the account, grant it the admin role in the database.</p>
      </form>
    </main>
  )
}
