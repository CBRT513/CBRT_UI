// File: /Users/cerion/CBRT_UI/src/managers/StaffManager.jsx

import React, { useState } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { addDoc, updateDoc, deleteDoc, collection, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { TableSkeleton, ErrorDisplay, EmptyState } from '../components/LoadingStates';
import StaffModal from '../modals/StaffModal';

export default function StaffManager() {
  const { data: staff, loading, error } = useFirestoreCollection('staff');
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

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
          updatedAt: new Date()
        });
      } else {
        await addDoc(collection(db, 'staff'), {
          ...staffData,
          createdAt: new Date()
        });
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

  if (loading) {
    return (
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
      </div>
    );
  }

  return (
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

      {showModal && (
        <StaffModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingStaff(null);
          }}
          onSave={handleSave}
          initialData={editingStaff}
        />
      )}
    </div>
  );
}