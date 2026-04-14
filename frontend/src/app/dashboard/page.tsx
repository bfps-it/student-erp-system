'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-muted-foreground text-sm font-medium">Loading session...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-card">
      {/* Top Navbar */}
      <header className="bg-primary shadow-md text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <span className="font-bold text-xl tracking-tight">BFPS ERP</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-primary-foreground/90">{user.email}</span>
              <Button variant="secondary" size="sm" onClick={() => logout(true)} className="font-medium px-4">
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6 border-t-4 border-t-primary">
          <h1 className="text-2xl font-bold text-foreground">Welcome to the Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            You are logged in as <span className="font-semibold text-primary">{user.email}</span> with role <span className="font-semibold text-primary">{user.role}</span>.
          </p>
        </div>
      </main>
    </div>
  );
}
