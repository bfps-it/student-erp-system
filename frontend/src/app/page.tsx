import { redirect } from 'next/navigation';

export default function Home() {
  // Direct user automatically to their dashboard. 
  // Middlewares or AuthContext handles unauthenticated ejection to /login
  redirect('/dashboard');
}
