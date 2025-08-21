/**
 * Barge2Rail Authentication Client
 * Drop this into any React app to use central authentication
 */

class Barge2RailAuth {
  constructor(config = {}) {
    this.appCode = config.appCode || 'unknown';
    this.authUrl = config.authUrl || 'http://localhost:8000';
    this.onAuthChange = config.onAuthChange || (() => {});
    this.tokenRefreshInterval = null;
  }

  // Email + Password login (for @barge.com users)
  async loginWithEmail(email, password) {
    return this._login({
      app_code: this.appCode,
      method: 'email',
      email,
      password
    });
  }

  // Username + PIN login (for field workers)
  async loginWithPin(username, pin) {
    return this._login({
      app_code: this.appCode,
      method: 'pin',
      username,
      pin
    });
  }

  // Firebase token login (if using Firebase Auth)
  async loginWithFirebase(firebaseToken) {
    return this._login({
      app_code: this.appCode,
      method: 'firebase',
      firebase_token: firebaseToken
    });
  }

  // Core login method
  async _login(credentials) {
    try {
      const response = await fetch(`${this.authUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const data = await response.json();
      
      // Store tokens and user info
      localStorage.setItem('br_access_token', data.access_token);
      localStorage.setItem('br_refresh_token', data.refresh_token);
      localStorage.setItem('br_user', JSON.stringify(data.user));
      localStorage.setItem('br_permissions', JSON.stringify(data.permissions));
      
      // Set up token refresh
      this._startTokenRefresh();
      
      // Notify app of auth change
      this.onAuthChange(data.user);
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Get current user
  getUser() {
    const userStr = localStorage.getItem('br_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Get user permissions
  getPermissions() {
    const permStr = localStorage.getItem('br_permissions');
    return permStr ? JSON.parse(permStr) : {};
  }

  // Check if user has specific permission
  hasPermission(permission) {
    const permissions = this.getPermissions();
    return permissions[permission] === true || permissions.all === true;
  }

  // Get user role
  getRole() {
    const user = this.getUser();
    return user ? user.role : null;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!localStorage.getItem('br_access_token');
  }

  // Get auth token for API calls
  getToken() {
    return localStorage.getItem('br_access_token');
  }

  // Verify current token
  async verifyToken() {
    const token = this.getToken();
    if (!token) return false;

    try {
      const response = await fetch(`${this.authUrl}/auth/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Logout
  async logout() {
    const token = this.getToken();
    
    if (token) {
      try {
        await fetch(`${this.authUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    // Clear local storage
    localStorage.removeItem('br_access_token');
    localStorage.removeItem('br_refresh_token');
    localStorage.removeItem('br_user');
    localStorage.removeItem('br_permissions');
    
    // Stop token refresh
    this._stopTokenRefresh();
    
    // Notify app
    this.onAuthChange(null);
  }

  // Set up automatic token refresh
  _startTokenRefresh() {
    this._stopTokenRefresh();
    
    // Refresh token every 30 minutes
    this.tokenRefreshInterval = setInterval(async () => {
      const refreshToken = localStorage.getItem('br_refresh_token');
      if (refreshToken) {
        try {
          const response = await fetch(`${this.authUrl}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken })
          });
          
          if (response.ok) {
            const data = await response.json();
            localStorage.setItem('br_access_token', data.access_token);
            if (data.refresh_token) {
              localStorage.setItem('br_refresh_token', data.refresh_token);
            }
          }
        } catch (error) {
          console.error('Token refresh error:', error);
        }
      }
    }, 30 * 60 * 1000);
  }

  _stopTokenRefresh() {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }
  }

  // Helper to make authenticated API calls
  async apiCall(url, options = {}) {
    const token = this.getToken();
    
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
  }
}

// React Hook for authentication
function useAuth(appCode) {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const authRef = React.useRef(null);

  React.useEffect(() => {
    // Initialize auth client
    authRef.current = new Barge2RailAuth({
      appCode,
      onAuthChange: (user) => {
        setUser(user);
      }
    });

    // Check if already logged in
    const existingUser = authRef.current.getUser();
    if (existingUser) {
      authRef.current.verifyToken().then(valid => {
        if (valid) {
          setUser(existingUser);
        } else {
          authRef.current.logout();
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

    return () => {
      if (authRef.current) {
        authRef.current._stopTokenRefresh();
      }
    };
  }, [appCode]);

  return {
    user,
    loading,
    auth: authRef.current,
    isAuthenticated: !!user,
    login: async (method, credentials) => {
      if (method === 'email') {
        return authRef.current.loginWithEmail(credentials.email, credentials.password);
      } else if (method === 'pin') {
        return authRef.current.loginWithPin(credentials.username, credentials.pin);
      }
    },
    logout: () => authRef.current?.logout(),
    hasPermission: (perm) => authRef.current?.hasPermission(perm) || false,
    getRole: () => authRef.current?.getRole()
  };
}

// Export for use in apps
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Barge2RailAuth, useAuth };
}