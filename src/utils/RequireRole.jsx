// Role-based access control utilities for CBRT UI
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { logger } from './logger';

/**
 * RequireRole - Higher-order component for protecting routes/components
 * @param {Object} props
 * @param {string|string[]} props.role - Required role(s)
 * @param {string} props.permission - Required permission
 * @param {React.ReactNode} props.children - Protected content
 * @param {React.ReactNode} props.fallback - Content to show when access denied
 * @param {boolean} props.redirect - Whether to redirect on failure
 */
export const RequireRole = ({ 
  role, 
  permission, 
  children, 
  fallback = null,
  redirect = false 
}) => {
  const { user, hasRole, hasAnyRole, hasPermission } = useAuth();

  // Check if user meets requirements
  const hasAccess = () => {
    if (!user) {
      logger.warn('RequireRole: No authenticated user');
      return false;
    }

    if (permission) {
      const allowed = hasPermission(permission);
      logger.debug('RequireRole: Permission check', { 
        permission, 
        allowed, 
        userRole: user.role 
      });
      return allowed;
    }

    if (Array.isArray(role)) {
      const allowed = hasAnyRole(role);
      logger.debug('RequireRole: Multi-role check', { 
        requiredRoles: role, 
        allowed, 
        userRole: user.role 
      });
      return allowed;
    }

    if (role) {
      const allowed = hasRole(role);
      logger.debug('RequireRole: Single role check', { 
        requiredRole: role, 
        allowed, 
        userRole: user.role 
      });
      return allowed;
    }

    return false;
  };

  if (!hasAccess()) {
    logger.warn('RequireRole: Access denied', {
      requiredRole: role,
      requiredPermission: permission,
      userRole: user?.role,
      userId: user?.id
    });

    if (redirect) {
      // Could implement redirect logic here
      window.location.href = '/unauthorized';
      return null;
    }

    return fallback || (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Access Denied
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>You don't have permission to access this resource.</p>
              <p className="mt-1">Required: {role || permission}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

/**
 * AuthGate - Login gate for entire application
 */
export const AuthGate = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-sm w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="text-center text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return children;
};

/**
 * LoginScreen - Authentication interface
 */
const LoginScreen = () => {
  const { signInWithEmail, signInWithGoogle, signInAnonymous, error } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch (err) {
      // Error is handled by context
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      // Error is handled by context
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    if (!signInAnonymous) return;
    
    setIsLoading(true);
    try {
      await signInAnonymous();
    } catch (err) {
      // Error is handled by context
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            CBRT Warehouse System
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleEmailSignIn}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign in with Email'}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="grid gap-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="ml-2">Google</span>
            </button>

            {signInAnonymous && (
              <button
                type="button"
                onClick={handleAnonymousSignIn}
                disabled={isLoading}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                Continue as Guest (Dev Only)
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * withRequireRole - HOC version of RequireRole
 */
export const withRequireRole = (WrappedComponent, role, permission) => {
  return function WithRequireRoleComponent(props) {
    return (
      <RequireRole role={role} permission={permission}>
        <WrappedComponent {...props} />
      </RequireRole>
    );
  };
};

export default RequireRole;