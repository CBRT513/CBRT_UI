// File: /Users/cerion/CBRT_UI/src/managers/StaffManager.jsx

import React, { useState } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { addDoc, updateDoc, deleteDoc, collection, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { TableSkeleton, ErrorDisplay, EmptyState } from '../components/LoadingStates';
import StaffModal from '../modals/StaffModal';
<<<<<<< Updated upstream
||||||| Stash base
import { EditIcon, DeleteIcon } from '../components/Icons';
=======
import { EditIcon, DeleteIcon } from '../components/Icons';
import { TableSkeleton, ErrorDisplay, EmptyState, LoadingSpinner } from '../components/LoadingStates';
>>>>>>> Stashed changes

export default function StaffManager() {
<<<<<<< Updated upstream
  const { data: staff, loading, error } = useFirestoreCollection('staff');
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
||||||| Stash base
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
=======
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
>>>>>>> Stashed changes

<<<<<<< Updated upstream
  const handleAdd = () => {
    setEditingStaff(null);
    setShowModal(true);
  };

  const handleEdit = (staffMember) => {
    setEditingStaff(staffMember);
    setShowModal(true);
  };

  const handleSave = async (staffData) => {
    try {
      if (editingStaff) {
        await updateDoc(doc(db, 'staff', editingStaff.id), {
          ...staffData,
          UpdatedAt: new Date()
        });
      } else {
        await addDoc(collection(db, 'staff'), {
          ...staffData,
          CreatedAt: new Date()
        });
||||||| Stash base
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'staff'),
      (snapshot) => {
        setRows(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching staff:', error);
        setLoading(false);
=======
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'staff'),
      (snapshot) => {
        try {
          setRows(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error('Error processing staff:', err);
          setError(err);
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error fetching staff:', error);
        setError(error);
        setLoading(false);
>>>>>>> Stashed changes
      }
      setShowModal(false);
      setEditingStaff(null);
    } catch (error) {
      console.error('Error saving staff:', error);
      throw error;
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this staff member?')) return;
    
    setLoadingId(id);
    try {
      await deleteDoc(doc(db, 'staff', id));
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('Failed to delete staff member');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;
    
    setActionLoading(id);
    try {
      await deleteDoc(doc(db, 'staff', id));
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('Failed to delete staff member. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
  };

  // Error state
  if (error && !loading) {
    return (
<<<<<<< Updated upstream
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Staff Management</h1>
          <TableSkeleton rows={5} columns={7} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Staff Management</h1>
          <ErrorDisplay message="Failed to load staff" />
        </div>
||||||| Stash base
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading staff...</div>
=======
      <div className="max-w-6xl mx-auto p-6">
        <PageHeader 
          title="Staff Management" 
          subtitle="Manage staff members" 
        />
        <ErrorDisplay 
          error={error} 
          onRetry={handleRetry}
          title="Failed to load staff data"
        />
>>>>>>> Stashed changes
      </div>
    );
  }

  return (
<<<<<<< Updated upstream
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <button
            onClick={handleAdd}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            + Add Staff Member
          </button>
        </div>
||||||| Stash base
    <>
      <PageHeader 
        title="Staff Management" 
        subtitle="Manage staff members" 
        buttonText="Add New Staff" 
        onAdd={() => {
          setCurrent(null);
          setOpen(true);
        }}
      />
=======
    <>
      <PageHeader 
        title="Staff Management" 
        subtitle="Manage staff members" 
        buttonText="Add New Staff" 
        onAdd={() => {
          setCurrent(null);
          setOpen(true);
        }}
        disabled={loading}
      />
>>>>>>> Stashed changes

<<<<<<< Updated upstream
        <div className="text-sm text-gray-600 mb-4">
          Manage staff members and their access permissions
        </div>

        {!staff || staff.length === 0 ? (
          <EmptyState 
            message="No staff members found"
            submessage="Start by adding new staff members."
            actionLabel="Add Staff Member"
            onAction={handleAdd}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SMS Notifications
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {staff.map((staffMember, index) => (
                  <tr key={staffMember.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {staffMember.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        staffMember.role === 'Admin' 
                          ? 'bg-purple-100 text-purple-800'
                          : staffMember.role === 'Office'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {staffMember.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {staffMember.email || 'Not provided'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {staffMember.phone || 'Not provided'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {staffMember.receivesNewRelease ? (
                        <span className="text-green-600">✓ Enabled</span>
                      ) : (
                        <span className="text-gray-400">Disabled</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        staffMember.status === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {staffMember.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(staffMember)}
                        className="text-green-600 hover:text-green-900 mr-3"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(staffMember.id)}
                        disabled={loadingId === staffMember.id}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        {loadingId === staffMember.id ? '⏳' : '🗑️'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {staff && staff.length > 0 && (
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{staff.length}</span> staff member{staff.length !== 1 ? 's' : ''} total
              {' | '}
              <span className="font-medium">
                {staff.filter(s => s.receivesNewRelease).length}
              </span> receiving SMS notifications
              {' | '}
              <span className="font-medium">
                {staff.filter(s => s.role === 'Warehouse').length}
              </span> warehouse staff
            </div>
          </div>
        )}
      </div>
||||||| Stash base
      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600">
            <tr>
              {fields.map(f => (
                <th key={f.name} className="px-6 py-3 text-left">{f.label}</th>
              ))}
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{r.name ?? '—'}</td>
                <td className="px-6 py-4">{r.email ?? '—'}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${
                    r.role === 'Admin' ? 'bg-red-100 text-red-800' :
                    r.role === 'Office' ? 'bg-blue-100 text-blue-800' :
                    r.role === 'Warehouse' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {r.role ?? '—'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    r.authType === 'Google' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {r.authType ?? '—'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    r.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {r.status ?? '—'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { 
                        setCurrent(r); 
                        setOpen(true); 
                      }}
                      className="text-green-800 hover:text-green-600"
                      title="Edit"
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to delete this staff member?')) {
                          await deleteDoc(doc(db, 'staff', r.id));
                        }
                      }}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No staff members found. Click "Add New Staff" to get started.
          </div>
        )}
      </div>
=======
      {loading ? (
        <TableSkeleton rows={6} columns={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No staff members found"
          description="Get started by adding a new staff member."
          actionText="Add New Staff"
          onAction={() => { setCurrent(null); setOpen(true); }}
        />
      ) : (
        <div className="bg-white shadow rounded overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-100 text-xs uppercase text-gray-600">
              <tr>
                {fields.map(f => (
                  <th key={f.name} className="px-6 py-3 text-left">{f.label}</th>
                ))}
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{r.name ?? '—'}</td>
                  <td className="px-6 py-4">{r.email ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${
                      r.role === 'Admin' ? 'bg-red-100 text-red-800' :
                      r.role === 'Office' ? 'bg-blue-100 text-blue-800' :
                      r.role === 'Warehouse' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {r.role ?? '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      r.authType === 'Google' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {r.authType ?? '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      r.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {r.status ?? '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { 
                          setCurrent(r); 
                          setOpen(true); 
                        }}
                        disabled={actionLoading === r.id}
                        className="text-green-800 hover:text-green-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                        title="Edit"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={actionLoading === r.id}
                        className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center"
                        title="Delete"
                      >
                        {actionLoading === r.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <DeleteIcon />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
>>>>>>> Stashed changes

<<<<<<< Updated upstream
      {showModal && (
        <StaffModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingStaff(null);
||||||| Stash base
      {open && (
        <StaffModal 
          title={`${current ? 'Edit' : 'Add'} Staff`} 
          initialData={current} 
          onClose={() => setOpen(false)} 
          onSave={async data => {
            if (current?.id) {
              await updateDoc(doc(db, 'staff', current.id), data);
            } else {
              await addDoc(collection(db, 'staff'), data);
            }
            setOpen(false);
=======
      {open && (
        <StaffModal 
          title={`${current ? 'Edit' : 'Add'} Staff`} 
          initialData={current} 
          onClose={() => setOpen(false)} 
          onSave={async data => {
            try {
              if (current?.id) {
                await updateDoc(doc(db, 'staff', current.id), data);
              } else {
                await addDoc(collection(db, 'staff'), data);
              }
              setOpen(false);
            } catch (error) {
              console.error('Error saving staff:', error);
              alert('Failed to save staff member. Please try again.');
            }
>>>>>>> Stashed changes
          }}
          onSave={handleSave}
          initialData={editingStaff}
        />
      )}
    </div>
  );
}