'use client';


import { useState } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';


export default function AuthForm() {
const [isSignup, setIsSignup] = useState(false);
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const router = useRouter();


const handleEmailAuth = async (e: React.FormEvent) => {
e.preventDefault();
try {
if (isSignup) {
await createUserWithEmailAndPassword(auth, email, password);
} else {
await signInWithEmailAndPassword(auth, email, password);
}
router.push('/calendar');
} catch (err: any) {
alert(err.message || 'Auth error');
}
};


const handleGoogle = async () => {
try {
await signInWithPopup(auth, googleProvider);
router.push('/calendar');
} catch (err: any) {
alert(err.message || 'Google sign-in failed');
}
};


return (
<div>
<form onSubmit={handleEmailAuth} className="space-y-4">
<div>
<label className="block text-sm">Email</label>
<input value={email} onChange={e => setEmail(e.target.value)} required className="w-full mt-1 p-2 border rounded" type="email" />
</div>
<div>
<label className="block text-sm">Password</label>
<input value={password} onChange={e => setPassword(e.target.value)} required className="w-full mt-1 p-2 border rounded" type="password" />
</div>
<div className="flex items-center gap-2">
<button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">{isSignup ? 'Sign up' : 'Log in'}</button>
<button type="button" onClick={() => setIsSignup(!isSignup)} className="text-sm text-slate-600">
{isSignup ? 'Have an account? Log in' : 'New here? Sign up'}
</button>
</div>
</form>


<div className="mt-6">
<button onClick={handleGoogle} className="w-full px-4 py-2 border rounded flex items-center justify-center gap-2">
 
<Image
  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
  alt="Google logo"
  width={20}
  height={20}
  className="w-5 h-5"
/>
Continue with Google
</button>
</div>
</div>
);
}