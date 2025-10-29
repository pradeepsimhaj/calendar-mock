'use client';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';


export function useUser() {
const [user, loading, error] = useAuthState(auth);
return { user, loading, error } as const;
}