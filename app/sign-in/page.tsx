'use client'

import { FormEvent, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

export default function SignInPage(){const router=useRouter();const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const submit=async(e:FormEvent)=>{e.preventDefault();setError('');const result=await authClient.signIn.email({email,password});if(result.error){setError('Unable to sign in. Check your details.');return}router.push('/admin');router.refresh()};return <main className="auth-page"><form className="auth-card" onSubmit={submit}><p className="eyebrow">Sahten Food</p><h1>Admin sign in</h1><label>Email<input className="field" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input className="field" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{error&&<p role="alert" className="error">{error}</p>}<button className="button primary full">Sign in</button></form></main>}
