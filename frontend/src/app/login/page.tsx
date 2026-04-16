'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

// BFPS Corporate Login Validation Scheme
const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address formatting" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { loginToken, user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If user is already authenticated, redirect to dashboard
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await api.post('/auth/login', {
        email: data.email,
        password: data.password,
      });

      if (response.data.success) {
        const { token, user } = response.data.data;
        loginToken(token, user);
        toast({
          title: "Login Successful",
          description: `Welcome to the BFPS ERP System, ${user.email}`,
        });
        // Let useEffect handle routing to dashboard
      }
    } catch (error: unknown) {
      // Axios interceptor will format the message or fallback here
      const err = error as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const errorMsg = err.response?.data?.error?.message || err.message || 'An unexpected error occurred.';
      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: errorMsg,
      });
      form.setValue('password', ''); // Clear password on failure for security 
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-card flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-primary">
          Baba Farid Public School
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Enterprise Resource Planning Ecosystem
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="shadow-lg border-t-4 border-t-primary border-x-0 border-b-0 rounded-b-xl rounded-t-sm bg-white">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-foreground font-semibold">Sign in to your account</CardTitle>
            <CardDescription className="text-center">
              Please enter your credentials to access the secure portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/90 font-medium tracking-tight">Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="admin@bfps.edu.in" {...field} className="focus-visible:ring-primary h-11" autoComplete="email" disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-foreground/90 font-medium tracking-tight">Password</FormLabel>
                        <a href="#" className="font-medium text-sm text-secondary hover:text-primary transition-colors">
                          Forgot your password?
                        </a>
                      </div>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className="focus-visible:ring-primary h-11" autoComplete="current-password" disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 text-base font-medium shadow-sm transition-all" disabled={isSubmitting}>
                  {isSubmitting ? 'Authenticating...' : 'Sign in'}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center bg-gray-50/50 rounded-b-xl mt-4 px-6 py-4 border-t border-border/50">
             <p className="text-xs text-muted-foreground text-center">
                Protected by strict 30-minute lockout policies. Unauthorized access is strictly prohibited and monitored.
             </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
