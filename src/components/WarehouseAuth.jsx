// File: /Users/cerion/CBRT_UI/src/components/WarehouseAuth.jsx
import React, { useState, useEffect, createContext, useContext } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { logger } from '../utils/logger';
import bcrypt from 'bcryptjs';

// Warehouse Auth Context
const WarehouseAuthContext = createContext();

// Hook to use warehouse auth
export const useWarehouseAuth = () => {
  const context = useContext(WarehouseAuthContext);
  if (!context) {
    throw new Error('useWarehouseAuth must be used within WarehouseAuthProvider');
  }
  return context;
};

// Warehouse Auth Provider
export const WarehouseAuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [sessionTimeout, setSessionTimeout] = useState(null);
  const [warningShown, setWarningShown] = useState(false);

  // Session timeout: 10 minutes
  const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds
  const WARNING_TIME = 1 * 60 * 1000; // Show warning 1 minute before timeout

  // Reset session timeout
  const resetTimeout = () => {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }
    setWarningShown(false);

    if (currentUser) {
      // Set warning timeout (9 minutes)
      const warningTimeout = setTimeout(() => {
        setWarningShown(true);
      }, SESSION_TIMEOUT - WARNING_TIME);

      // Set logout timeout (10 minutes)
      const logoutTimeout = setTimeout(() => {
        logout();
      }, SESSION_TIMEOUT);

      setSessionTimeout({ warning: warningTimeout, logout: logoutTimeout });
    }
  };

  // Activity listener to reset timeout
  useEffect(() => {
    if (currentUser) {
      const activity = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      
      const resetActivity = () => resetTimeout();
      
      activity.forEach(event => {
        document.addEventListener(event, resetActivity, true);
      });

      return () => {
        activity.forEach(event => {
          document.removeEventListener(event, resetActivity, true);
        });
      };
    }
  }, [currentUser]);

  const login = async (userData) => {
    setCurrentUser(userData);
    resetTimeout();
    await logger.info('Warehouse user logged in', { 
      userId: userData.id, 
      userName: userData.name 
    });
  };

  const logout = async () => {
    if (currentUser) {
      await logger.info('Warehouse user logged out', { 
        userId: currentUser.id, 
        userName: currentUser.name,
        reason: warningShown ? 'Session timeout' : 'Manual logout'
      });
    }
    
    if (sessionTimeout) {
      clearTimeout(sessionTimeout.warning);
      clearTimeout(sessionTimeout.logout);
    }
    
    setCurrentUser(null);
    setSessionTimeout(null);
    setWarningShown(false);
  };

  const extendSession = () => {
    resetTimeout();
    setWarningShown(false);
  };

  const value = {
    currentUser,
    login,
    logout,
    extendSession,
    warningShown,
    isAuthenticated: !!currentUser
  };

  return (
    <WarehouseAuthContext.Provider value={value}>
      {children}
      {/* Session Warning Modal */}
      {warningShown && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="text-yellow-500 text-4xl mb-4">⏰</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Session Expiring Soon
              </h3>
              <p className="text-gray-600 mb-4">
                Your session will expire in 1 minute due to inactivity.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={extendSession}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Stay Logged In
                </button>
                <button
                  onClick={logout}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Logout Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </WarehouseAuthContext.Provider>
  );
};

// Warehouse Login Component
const WarehouseLogin = () => {
  const [step, setStep] = useState('SELECT_USER'); // SELECT_USER, ENTER_PIN, CREATE_PIN
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { data: staff } = useFirestoreCollection('staff');
  const { login } = useWarehouseAuth();

  // Filter warehouse staff only
  const warehouseStaff = staff?.filter(person => 
    person.role === 'Warehouse' && person.status === 'Active'
  ) || [];

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setError('');
    setPin('');
    setConfirmPin('');
    
    // Check if user needs to set up PIN
    if (!user.pinSetup) {
      setStep('CREATE_PIN');
    } else {
      setStep('ENTER_PIN');
    }
  };

  const validatePin = (pinValue) => {
    if (pinValue.length < 4 || pinValue.length > 6) {
      return 'PIN must be 4-6 characters';
    }
    if (!/^[a-zA-Z0-9]+$/.test(pinValue)) {
      return 'PIN can only contain letters and numbers';
    }
    return null;
  };

  const handleCreatePin = async (e) => {
    e.preventDefault();
    setError('');
    
    const pinError = validatePin(pin);
    if (pinError) {
      setError(pinError);
      return;
    }
    
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setIsLoading(true);
    
    try {
      // Hash the PIN
      const pinHash = await bcrypt.hash(pin, 10);
      
      // Update user record
      await updateDoc(doc(db, 'staff', selectedUser.id), {
        pinHash,
        pinSetup: true,
        firstPinSetup: new Date().toISOString()
      });
      
      await logger.info('PIN created for warehouse user', {
        userId: selectedUser.id,
        userName: selectedUser.name
      });
      
      // Log them in
      await login({
        id: selectedUser.id,
        name: selectedUser.name,
        role: selectedUser.role
      });
      
    } catch (error) {
      console.error('PIN creation error:', error);
      setError('Failed to create PIN. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnterPin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!pin) {
      setError('Please enter your PIN');
      return;
    }

    setIsLoading(true);
    
    try {
      // Validate PIN against stored hash
      const isValid = await bcrypt.compare(pin, selectedUser.pinHash);
      
      if (isValid) {
        await logger.info('Warehouse user authenticated', {
          userId: selectedUser.id,
          userName: selectedUser.name
        });
        
        // Log them in
        await login({
          id: selectedUser.id,
          name: selectedUser.name,
          role: selectedUser.role
        });
      } else {
        setError('Incorrect PIN. Please try again.');
        setPin('');
      }
      
    } catch (error) {
      console.error('PIN validation error:', error);
      setError('Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    setStep('SELECT_USER');
    setSelectedUser(null);
    setPin('');
    setConfirmPin('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🏭</div>
          <h1 className="text-2xl font-bold text-gray-900">CBRT Warehouse</h1>
          <p className="text-gray-600">Warehouse Staff Login</p>
        </div>

        {/* Step 1: Select User */}
        {step === 'SELECT_USER' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Select Your Name
            </h2>
            
            {warehouseStaff.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No warehouse staff found. Contact admin to set up your account.
              </div>
            ) : (
              <div className="space-y-2">
                {warehouseStaff.map((person) => (
                  <button
                    key={person.id}
                    onClick={() => handleUserSelect(person)}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{person.name}</div>
                    <div className="text-sm text-gray-500">
                      {person.pinSetup ? '🔐 PIN setup complete' : '📱 First time setup required'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Create PIN */}
        {step === 'CREATE_PIN' && (
          <div>
            <button
              onClick={goBack}
              className="mb-4 text-blue-600 hover:text-blue-700 text-sm flex items-center"
            >
              ← Back to staff selection
            </button>
            
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Create Your PIN
            </h2>
            <p className="text-gray-600 mb-6">
              Hi <strong>{selectedUser?.name}</strong>! Create a PIN for secure access.
            </p>
            
            <form onSubmit={handleCreatePin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New PIN (4-6 characters)
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Letters and numbers only"
                  maxLength="6"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg text-center tracking-widest"
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm PIN
                </label>
                <input
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="Re-enter your PIN"
                  maxLength="6"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg text-center tracking-widest"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !pin || !confirmPin}
                className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isLoading ? 'Creating PIN...' : 'Create PIN & Login'}
              </button>
            </form>

            <div className="mt-4 text-xs text-gray-500 text-center">
              📱 Your PIN will be securely encrypted and stored
            </div>
          </div>
        )}

        {/* Step 3: Enter PIN */}
        {step === 'ENTER_PIN' && (
          <div>
            <button
              onClick={goBack}
              className="mb-4 text-blue-600 hover:text-blue-700 text-sm flex items-center"
            >
              ← Back to staff selection
            </button>
            
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Enter Your PIN
            </h2>
            <p className="text-gray-600 mb-6">
              Welcome back, <strong>{selectedUser?.name}</strong>!
            </p>
            
            <form onSubmit={handleEnterPin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PIN
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter your PIN"
                  maxLength="6"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xl text-center tracking-widest"
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !pin}
                className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <div className="mt-4 text-xs text-gray-500 text-center">
              🔐 Session will timeout after 10 minutes of inactivity
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Warehouse Auth Component
export default function WarehouseAuth({ children }) {
  const { isAuthenticated } = useWarehouseAuth();
  
  if (!isAuthenticated) {
    return <WarehouseLogin />;
  }
  
  return children;
}