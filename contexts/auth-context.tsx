'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api, authApi, User, clearAuthData, getStoredUser, updateStoredUser, isAuthenticated as checkAuth } from '@/lib/api';
import { resetRealtimeSocket } from '@/lib/realtimeSocket';

// =============================================================================
// TYPES
// =============================================================================

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPro: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role?: string) => Promise<void>;
  googleSignIn: (token: string, tokenType?: 'idToken' | 'accessToken' | 'authCode', role?: 'user' | 'interviewer') => Promise<void>;
  logout: () => void;
  updateProfile: (data: { name?: string }) => Promise<void>;
  upgradePlan: (plan?: 'pro' | 'free') => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

// Resolve the home surface for a given role. Admins land on the admin panel,
// interviewers on their dashboard, everyone else on the candidate dashboard.
function roleHomePath(role?: string): string {
  if (role === 'admin') return '/admin-dashboard';
  if (role === 'interviewer') return '/interviewer-dashboard';
  return '/dashboard';
}

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password', '/verify-email'];

// Auth pages a logged-in user should never sit on — bounce them to their dashboard.
const AUTH_ONLY_ROUTES = ['/login', '/signup'];

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if current route is public
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check for stored user first
        const storedUser = getStoredUser();
        
        if (storedUser && checkAuth()) {
          setUser(storedUser);
          
          // Verify token is still valid in background
          try {
            const response = await authApi.verifyToken();
            if (response.success && response.data.user) {
              setUser(response.data.user);
              // Keep localStorage fresh so derived flags (e.g. hasPassword)
              // don't go stale on the next reload.
              updateStoredUser(response.data.user);
            }
          } catch {
            // Token invalid - clear auth and redirect if on protected route
            clearAuthData();
            setUser(null);
            if (!isPublicRoute) {
              router.push('/login');
            }
          }
        } else if (!isPublicRoute) {
          // No auth and on protected route - redirect to login
          router.push('/login');
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError('Failed to initialize authentication');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [isPublicRoute, router]);

  // Keep authenticated users off the login/signup pages. Covers the forward
  // button and any direct navigation back to an auth page after sign-in.
  useEffect(() => {
    if (!isLoading && user && AUTH_ONLY_ROUTES.includes(pathname)) {
      router.replace(roleHomePath(user.user_role));
    }
  }, [isLoading, user, pathname, router]);

  // Login handler
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await authApi.login(email, password);

      if (response.success && response.data) {
        setUser(response.data.user);
        // replace (not push) so /login is dropped from history — back button
        // from the dashboard goes to the landing page, not back to login.
        router.replace(roleHomePath(response.data.user.user_role));
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (err) {
      // Unverified account → send them to the OTP screen instead of a dead end.
      const code = (err as { code?: string })?.code;
      if (code === 'EMAIL_NOT_VERIFIED') {
        const pendingEmail = (err as { email?: string })?.email || email;
        router.push(`/verify-email?email=${encodeURIComponent(pendingEmail)}`);
      }
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Signup handler
  const signup = useCallback(async (name: string, email: string, password: string, role?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await authApi.register(name, email, password, role);

      if (response.success) {
        // Registration no longer logs the user in — it emails a 6-digit code.
        // Make sure no stale session lingers, then move to the OTP screen.
        clearAuthData();
        setUser(null);
        const pendingEmail = response.data?.email || email;
        router.replace(`/verify-email?email=${encodeURIComponent(pendingEmail)}`);
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Google Sign-In handler
  const googleSignIn = useCallback(async (
    token: string,
    tokenType: 'idToken' | 'accessToken' | 'authCode' = 'authCode',
    role?: 'user' | 'interviewer',
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.googleSignIn(token, tokenType, role);

      if (response.success && response.data) {
        setUser(response.data.user);

        // First-time Google signup with no password yet → show set-password screen.
        if (response.data.isNewUser && !response.data.user.hasPassword) {
          router.replace('/auth/set-password');
          return;
        }

        router.replace(roleHomePath(response.data.user.user_role));
      } else {
        throw new Error(response.message || 'Google sign-in failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Logout handler
  const logout = useCallback(() => {
    authApi.logout();
    resetRealtimeSocket(); // drop the authenticated socket so next login reconnects fresh
    setUser(null);
    setError(null);
    router.push('/login');
  }, [router]);

  // Update profile handler
  const updateProfile = useCallback(async (data: { name?: string }) => {
    setError(null);
    
    try {
      const response = await authApi.updateProfile(data);

      if (response.success && response.data) {
        setUser(response.data);
        updateStoredUser(response.data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Profile update failed';
      setError(message);
      throw err;
    }
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      const response = await authApi.getProfile();
      if (response.success && response.data) {
        setUser(response.data);
        updateStoredUser(response.data);
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Upgrade plan handler
  const upgradePlan = useCallback(async (plan: 'pro' | 'free' = 'pro') => {
    setError(null);
    try {
      const response = await authApi.upgradePlan(plan);
      if (response.success && response.data) {
        setUser(response.data.user);
        // Replace the stored token so the new plan is reflected immediately
        if (typeof window !== 'undefined') {
          localStorage.setItem('aiInterviewToken', response.data.token);
          localStorage.setItem('aiInterviewUser', JSON.stringify(response.data.user));
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Plan upgrade failed';
      setError(message);
      throw err;
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user && checkAuth(),
    isPro: user?.plan === 'pro',
    error,
    login,
    signup,
    googleSignIn,
    logout,
    updateProfile,
    upgradePlan,
    refreshUser,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to protect routes - redirects to login if not authenticated
 */
export function useRequireAuth() {
  const auth = useAuth();
  const { isAuthenticated, isLoading } = auth;
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Return the full auth context (login, updateProfile, refreshUser, …) plus
  // the redirect guard, so protected pages can both guard and act on auth.
  return auth;
}

/**
 * Hook to get current user info
 */
export function useCurrentUser() {
  const { user, isLoading } = useAuth();
  return { user, isLoading };
}

export default AuthContext;
