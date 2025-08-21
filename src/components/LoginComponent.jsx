/**
 * Universal Login Component for Barge2Rail Apps
 * Drop this into your React app for instant authentication
 */

import React, { useState } from 'react';
import { Barge2RailAuth } from './auth-client';

const LoginComponent = ({ appCode, onLoginSuccess }) => {
  const [loginMethod, setLoginMethod] = useState('pin'); // 'email' or 'pin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const auth = new Barge2RailAuth({ 
    appCode,
    authUrl: process.env.REACT_APP_AUTH_URL || 'http://localhost:8000'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      
      if (loginMethod === 'email') {
        if (!email || !password) {
          throw new Error('Email and password are required');
        }
        result = await auth.loginWithEmail(email, password);
      } else {
        if (!username || !pin) {
          throw new Error('Username and PIN are required');
        }
        result = await auth.loginWithPin(username, pin);
      }

      // Success - call parent callback
      if (onLoginSuccess) {
        onLoginSuccess(result.user);
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <h2 style={styles.title}>Barge2Rail Login</h2>
        
        {/* Login method selector */}
        <div style={styles.methodSelector}>
          <button
            style={{
              ...styles.methodButton,
              ...(loginMethod === 'email' ? styles.methodButtonActive : {})
            }}
            onClick={() => setLoginMethod('email')}
            type="button"
          >
            Email Login
          </button>
          <button
            style={{
              ...styles.methodButton,
              ...(loginMethod === 'pin' ? styles.methodButtonActive : {})
            }}
            onClick={() => setLoginMethod('pin')}
            type="button"
          >
            PIN Login
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {loginMethod === 'email' ? (
            <>
              <input
                type="email"
                placeholder="Email (@barge.com)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                disabled={loading}
                autoComplete="email"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                disabled={loading}
                autoComplete="current-password"
              />
            </>
          ) : (
            <>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.input}
                disabled={loading}
                autoComplete="username"
              />
              <input
                type="password"
                placeholder="PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                style={styles.input}
                disabled={loading}
                maxLength="6"
                autoComplete="off"
              />
            </>
          )}

          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          <button
            type="submit"
            style={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={styles.appInfo}>
          Accessing: <strong>{appCode}</strong>
        </div>
      </div>
    </div>
  );
};

// Styles
const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  loginBox: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px'
  },
  title: {
    textAlign: 'center',
    marginBottom: '1.5rem',
    color: '#333'
  },
  methodSelector: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem'
  },
  methodButton: {
    flex: 1,
    padding: '0.75rem',
    border: '1px solid #ddd',
    backgroundColor: 'white',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: '14px'
  },
  methodButtonActive: {
    backgroundColor: '#007bff',
    color: 'white',
    borderColor: '#007bff'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '16px',
    transition: 'border-color 0.2s'
  },
  submitButton: {
    padding: '0.75rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  error: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '0.75rem',
    borderRadius: '4px',
    fontSize: '14px'
  },
  appInfo: {
    textAlign: 'center',
    marginTop: '1.5rem',
    fontSize: '12px',
    color: '#666'
  }
};

export default LoginComponent;