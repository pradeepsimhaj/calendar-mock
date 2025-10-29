// 'use client';

// import Link from 'next/link';
// import { signOut } from 'firebase/auth';
// import { auth } from '../lib/firebase';
// import { useUser } from '../lib/auth';

// export default function Navbar() {
// const { user, loading } = useUser();

// return (
// <header className="bg-white shadow">
// <div className="container mx-auto px-4 py-3 flex justify-between items-center">
// <Link href="/">
// <span className="font-bold text-xl cursor-pointer">Calendar Mock</span>
// </Link>

// <nav className="flex items-center gap-4">
// <Link href="/calendar">
// <span className="text-slate-600 hover:text-black cursor-pointer">Calendar</span>
// </Link>

// {loading ? null : user ? (
// <>
// <span className="text-sm text-slate-600">{user.email}</span>
// <button
// onClick={() => signOut(auth)}
// className="px-3 py-1 bg-rose-500 text-white rounded"
// >
// Sign Out
// </button>
// </>
// ) : (
// <Link href="/">
// <span className="px-3 py-1 bg-indigo-600 text-white rounded cursor-pointer">Login</span>
// </Link>
// )}
// </nav>
// </div>
// </header>
// );
// }

// src/components/Navbar.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useUser } from "../lib/auth";

export default function Navbar() {
  const { user, loading } = useUser();
  const [open, setOpen] = useState(false);

  // decide where brand should route
  const brandHref = user ? "/calendar" : "/";

  // helper to show truncated email on small screens
  const renderEmail = (email?: string | null) => {
    if (!email) return null;
    if (email.length > 18) return email.slice(0, 12) + "..." + email.slice(-5);
    return email;
  };

  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: Brand */}
        <div className="flex items-center gap-4">
          <Link href={brandHref} className="flex items-center gap-3">
            <span className="font-bold text-xl leading-none select-none">
              Calendar Mock
            </span>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-4">
          <Link href="/calendar" className="text-slate-600 hover:text-black">
            Calendar
          </Link>

          {!loading && user ? (
            <>
              <div className="text-sm text-slate-600">
                {renderEmail(user.email)}
              </div>
              <button
                onClick={() => signOut(auth)}
                className="px-3 py-1 bg-rose-500 text-white rounded"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/"
              className="px-3 py-1 bg-indigo-600 text-white rounded"
            >
              Login
            </Link>
          )}
        </nav>

        {/* Mobile menu toggle */}
        <div className="md:hidden flex items-center">
          <button
            aria-expanded={open}
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className="p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500"
          >
            {/* hamburger / close icon */}
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {open ? (
                <path
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t bg-white">
          <div className="container mx-auto px-4 py-3 space-y-3">
            <Link
              href="/calendar"
              className="block text-slate-700 py-2 rounded hover:bg-slate-50"
            >
              Calendar
            </Link>

            {!loading && user ? (
              <div className="flex flex-col items-start gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-700">
                    {user?.displayName ?? renderEmail(user?.email)}
                  </div>
                  {user?.email && (
                    <div className="text-xs text-slate-500">{user.email}</div>
                  )}
                </div>

                <button
                  onClick={() => {
                    signOut(auth);
                    setOpen(false);
                  }}
                  className="px-3 py-1 bg-rose-500 text-white rounded w-full md:w-auto"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/"
                className="block px-3 py-2 bg-indigo-600 text-white rounded text-center"
                onClick={() => setOpen(false)}
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
