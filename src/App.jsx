import React, { useState, useEffect } from 'react';
// Import our manual Firebase configuration
import { db, auth } from './firebase'; 
import { signInAnonymously } from 'firebase/auth';
import { collection, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';

// --- Helper Components ---

const UserPlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="22" x2="22" y1="8" y2="14"/><line x1="19" x2="25" y1="11" y2="11"/></svg>
);
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
);
const ToggleOnIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="7" ry="7"></rect><circle cx="16" cy="12" r="3"></circle></svg>
);
const ToggleOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="7" ry="7"></rect><circle cx="8" cy="12" r="3"></circle></svg>
);

// --- Main Application Component ---

export default function App() {
  // --- State Management ---
  const [staffList, setStaffList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStaff, setCurrentStaff] = useState(null);

  // --- Firebase Connection & Data Fetching ---
  useEffect(() => {
    // Authenticate anonymously to satisfy security rules for development
    signInAnonymously(auth).catch(err => console.error("Anonymous sign-in failed:", err));

    const staffCollection = collection(db, 'staff');
    
    // onSnapshot provides real-time updates.
    const unsubscribe = onSnapshot(staffCollection, (snapshot) => {
      const staffData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStaffList(staffData);
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching staff data:", err);
      setError("Could not fetch staff data. Please check Firestore security rules and collection name.");
      setIsLoading(false);
    });

    // Cleanup subscription on component unmount
    return () => unsubscribe();
  }, []);

  // --- UI Event Handlers ---
  const handleOpenModal = (staff = null) => {
    setCurrentStaff(staff);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentStaff(null);
  };

  // --- Main Render ---
  return (
    <div className="bg-brand-neutral min-h-screen font-sans text-brand-secondary">
      <div className="container mx-auto p-4 md:p-8">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold font-serif text-brand-primary">Staff Management</h1>
            <p className="text-brand-secondary">Manage accounts for office and warehouse personnel.</p>
          </div>
          <button
            onClick={() => handleOpenModal(null)}
            className="flex items-center gap-2 bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:opacity-90 transition-opacity"
          >
            <UserPlusIcon />
            <span>Add New Staff</span>
          </button>
        </header>

        {isLoading && <div className="text-center p-8">Loading staff data...</div>}
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">{error}</div>}
        
        {!isLoading && !error && (
          <StaffTable staffList={staffList} onEdit={handleOpenModal} />
        )}
      </div>

      {isModalOpen && (
        <StaffModal
          staff={currentStaff}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

// --- Child Components ---

function StaffTable({ staffList, onEdit }) {
  
  const handleStatusToggle = async (staff) => {
    const newStatus = staff.status === 'Active' ? 'Inactive' : 'Active';
    const staffDocRef = doc(db, 'staff', staff.id);
    try {
      await updateDoc(staffDocRef, { status: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status.");
    }
  };

  if (staffList.length === 0) {
    return <div className="text-center p-8 bg-white rounded-lg shadow">No staff members found. Click "Add New Staff" to begin.</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="w-full min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Display Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auth Info</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {staffList.map(staff => (
            <tr key={staff.id} className="hover:bg-brand-neutral">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{staff.displayName}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  staff.role === 'admin' ? 'bg-red-100 text-red-800' :
                  staff.role === 'office' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }`}>
                  {staff.role}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {staff.authType === 'pin' ? `PIN: ${staff.authIdentifier}` : staff.authIdentifier}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${staff.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {staff.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onClick={() => handleStatusToggle(staff)} className="text-gray-500 hover:text-gray-700 mr-4" title={staff.status === 'Active' ? 'Deactivate' : 'Activate'}>
                    {staff.status === 'Active' ? <ToggleOnIcon /> : <ToggleOffIcon />}
                </button>
                <button onClick={() => onEdit(staff)} className="text-brand-primary hover:opacity-80">
                  <EditIcon />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StaffModal({ staff, onClose }) {
  const [formData, setFormData] = useState({
    displayName: staff?.displayName || '',
    role: staff?.role || 'warehouse',
    authType: staff?.authType || 'pin',
    authIdentifier: staff?.authIdentifier || '',
  });
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const isEditMode = !!staff;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAuthTypeChange = (e) => {
    setFormData(prev => ({ ...prev, authType: e.target.value, authIdentifier: '' }));
  };

  const validateForm = () => {
    if (!formData.displayName.trim()) return "Display Name is required.";
    if (!formData.authIdentifier.trim()) return formData.authType === 'pin' ? 'PIN is required.' : 'Email is required.';
    if (formData.authType === 'pin' && !/^\d{4}$/.test(formData.authIdentifier)) return "PIN must be exactly 4 digits.";
    if (formData.authType === 'email' && !/\S+@\S+\.\S+/.test(formData.authIdentifier)) return "Please enter a valid email address.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    
    setFormError('');
    setIsSaving(true);

    try {
      const dataToSave = {
        displayName: formData.displayName,
        role: formData.role,
        authType: formData.authType,
        authIdentifier: formData.authIdentifier,
      };

      if (isEditMode) {
        await updateDoc(doc(db, 'staff', staff.id), dataToSave);
      } else {
        await addDoc(collection(db, 'staff'), { ...dataToSave, status: 'Active' });
      }
      onClose();
    } catch (err) {
      console.error("Error saving staff data:", err);
      setFormError("Failed to save data. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-2xl p-6 md:p-8 w-full max-w-md m-4">
        <h2 className="text-2xl font-bold font-serif text-brand-primary mb-4">{isEditMode ? 'Edit Staff Member' : 'Add New Staff Member'}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">Display Name</label>
              <input type="text" name="displayName" id="displayName" value={formData.displayName} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary" />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
              <select name="role" id="role" value={formData.role} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary">
                <option value="warehouse">Warehouse</option>
                <option value="office">Office</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Authentication Method</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <button type="button" onClick={() => handleAuthTypeChange({ target: { value: 'pin' }})} className={`px-4 py-2 rounded-l-md border border-gray-300 w-1/2 ${formData.authType === 'pin' ? 'bg-brand-primary text-white' : 'bg-white text-gray-700'}`}>PIN</button>
                <button type="button" onClick={() => handleAuthTypeChange({ target: { value: 'email' }})} className={`px-4 py-2 rounded-r-md border border-gray-300 -ml-px w-1/2 ${formData.authType === 'email' ? 'bg-brand-primary text-white' : 'bg-white text-gray-700'}`}>Email</button>
              </div>
            </div>
            <div>
              <label htmlFor="authIdentifier" className="block text-sm font-medium text-gray-700">{formData.authType === 'pin' ? '4-Digit PIN' : 'Email Address'}</label>
              <input 
                type={formData.authType === 'pin' ? 'text' : 'email'} 
                name="authIdentifier" 
                id="authIdentifier" 
                value={formData.authIdentifier} 
                onChange={handleChange}
                maxLength={formData.authType === 'pin' ? 4 : undefined}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary" 
              />
            </div>
          </div>

          {formError && <p className="mt-4 text-sm text-red-600">{formError}</p>}

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="bg-brand-primary py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
