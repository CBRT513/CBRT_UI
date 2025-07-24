import React, { useState, useEffect } from 'react';
// Import our manual Firebase configuration
import { db, auth } from './firebase'; 
import { signInAnonymously } from 'firebase/auth';
import { collection, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';

// --- Helper Icon Components ---
const UserPlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="22" x2="22" y1="8" y2="14"/><line x1="19" x2="25" y1="11" y2="11"/></svg>);
const EditIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>);
const ToggleOnIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="7" ry="7"></rect><circle cx="16" cy="12" r="3"></circle></svg>);
const ToggleOffIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="7" ry="7"></rect><circle cx="8" cy="12" r="3"></circle></svg>);

// --- Main Application Component ---
export default function App() {
  const [view, setView] = useState('customers'); // 'staff' or 'customers'

  // Authenticate anonymously once when the app loads
  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error("Anonymous sign-in failed:", err));
  }, []);

  return (
    <div className="bg-brand-neutral min-h-screen font-sans text-brand-secondary">
      <header className="bg-white shadow-md">
        <nav className="container mx-auto flex items-center p-4">
          <h1 className="text-xl font-bold font-serif text-brand-primary mr-6">CBRT App</h1>
          <div className="flex gap-4">
            <NavButton text="Customers" onClick={() => setView('customers')} isActive={view === 'customers'} />
            <NavButton text="Staff" onClick={() => setView('staff')} isActive={view === 'staff'} />
          </div>
        </nav>
      </header>
      <main className="container mx-auto p-4 md:p-8">
        {view === 'staff' && <StaffManager />}
        {view === 'customers' && <CustomerManager />}
      </main>
    </div>
  );
}

// --- Navigation Button Component ---
const NavButton = ({ text, onClick, isActive }) => (
  <button
    onClick={onClick}
    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-brand-primary text-white'
        : 'text-brand-secondary hover:bg-gray-100'
    }`}
  >
    {text}
  </button>
);


// --- Staff Management Component ---
function StaffManager() {
  const [staffList, setStaffList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStaff, setCurrentStaff] = useState(null);
  const [modalKey, setModalKey] = useState(0);

  useEffect(() => {
    const staffCollection = collection(db, 'staff');
    const unsubscribe = onSnapshot(staffCollection, (snapshot) => {
      const staffData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStaffList(staffData);
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching staff data:", err);
      setError("Could not fetch staff data.");
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenModal = (staff = null) => {
    setCurrentStaff(staff);
    setModalKey(prevKey => prevKey + 1);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold font-serif text-brand-primary">Staff Management</h2>
          <p className="text-brand-secondary">Manage accounts for office and warehouse personnel.</p>
        </div>
        <button onClick={() => handleOpenModal(null)} className="flex items-center gap-2 bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:opacity-90 transition-opacity">
          <UserPlusIcon /><span>Add New Staff</span>
        </button>
      </div>
      {isLoading && <p>Loading staff...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!isLoading && !error && <StaffTable staffList={staffList} onEdit={handleOpenModal} />}
      {isModalOpen && <StaffModal key={modalKey} staff={currentStaff} onClose={handleCloseModal} />}
    </div>
  );
}

// --- Customer Management Component ---
function CustomerManager() {
  const [customerList, setCustomerList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [modalKey, setModalKey] = useState(0);

  useEffect(() => {
    const customerCollection = collection(db, 'customers');
    const unsubscribe = onSnapshot(customerCollection, (snapshot) => {
      const customerData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomerList(customerData);
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching customer data:", err);
      setError("Could not fetch customer data.");
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenModal = (customer = null) => {
    setCurrentCustomer(customer);
    setModalKey(prevKey => prevKey + 1);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold font-serif text-brand-primary">Customer Management</h2>
          <p className="text-brand-secondary">Manage customer accounts and shipping addresses.</p>
        </div>
        <button onClick={() => handleOpenModal(null)} className="flex items-center gap-2 bg-brand-primary te