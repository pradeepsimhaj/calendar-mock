'use client';


import AuthForm from '../components/AuthForm';


export default function HomePage() {
return (
<div className="max-w-2xl mx-auto mt-12">
<div className="bg-white rounded-2xl shadow p-8">
<h1 className="text-2xl font-bold mb-2">Welcome to Calendar Mock</h1>
<p className="text-slate-600 mb-6">Sign up or log in to start managing events.</p>
<AuthForm />
</div>
</div>
);
}