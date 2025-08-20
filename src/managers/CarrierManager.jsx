import React, { useState } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { addDoc, updateDoc, deleteDoc, collection, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

const CarrierManager = () => {
  const { data: carriers, loading, error } = useFirestoreCollection('carriers');
  const [showModal, setShowModal] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState(null);
  const [formData, setFormData] = useState({
    carrierName: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    status: 'Active'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({
      carrierName: '',
      contactName: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      status: 'Active'
    });
    setEditingCarrier(null);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
    setIsSubmitting(false);
  };

  const handleAddCarrier = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEditCarrier = (carrier) => {
    setFormData({
      carrierName: carrier.CarrierName || '',
      contactName: carrier.ContactName || '',
      phone: carrier.Phone || '',
      email: carrier.Email || '',
      address: carrier.Address || '',
      city: carrier.City || '',
      state: carrier.State || '',
      zipCode: carrier.ZipCode || '',
      status: carrier.Status || 'Active'
    });
    setEditingCarrier(carrier);
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.carrierName.trim()) {
      alert('Carrier Name is required');
      return false;
    }
    return true;
  };

  const checkForDuplicate = () => {
    if (!carriers) return false;
    
    const duplicate = carriers.find(carrier => 
      carrier.CarrierName?.toLowerCase() === formData.carrierName.toLowerCase() &&
      (!editingCarrier || carrier.id !== editingCarrier.id)
    );
    
    if (duplicate) {
      alert('A carrier with this name already exists');
      return true;
    }
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    if (!validateForm()) return;
    if (checkForDuplicate()) return;

    setIsSubmitting(true);

    try {
      const dbData = {
        CarrierName: formData.carrierName,
        ContactName: formData.contactName,
        Phone: formData.phone,
        Email: formData.email,
        Address: formData.address,
        City: formData.city,
        State: formData.state,
        ZipCode: formData.zipCode,
        Status: formData.status
      };

      if (editingCarrier) {
        await updateDoc(doc(db, 'carriers', editingCarrier.id), {
          ...dbData,
          updatedAt: new Date()
        });
        console.log('Carrier updated successfully');
      } else {
        await addDoc(collection(db, 'carriers'), {
          ...dbData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('Carrier added successfully');
      }
      closeModal();
    } catch (error) {
      console.error('Error saving carrier:', error);
      alert('Error saving carrier. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCarrier = async (carrierId) => {
    if (window.confirm('Are you sure you want to delete this carrier?')) {
      try {
        await deleteDoc(doc(db, 'carriers', carrierId));
        console.log('Carrier deleted successfully');
      } catch (error) {
        console.error('Error deleting carrier:', error);
        alert('Error deleting carrier. Please try again.');
      }
    }
  };

  if (loading) return <div className="flex justify-center p-8">Loading carriers...</div>;
  if (error) return <div className="text-red-600 p-8">Error loading carriers: {error.message}</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Carriers</h1>
        <button
          onClick={handleAddCarrier}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          + Add Carrier
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Carrier Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                City/State
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
            {carriers?.map((carrier) => (
              <tr key={carrier.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {carrier.CarrierName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {carrier.ContactName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {carrier.Phone}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {carrier.Email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {carrier.City}, {carrier.State}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    carrier.Status === 'Active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {carrier.Status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEditCarrier(carrier)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteCarrier(carrier.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(!carriers || carriers.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            No carriers found. Click "Add Carrier" to get started.
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-screen overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingCarrier ? 'Edit Carrier' : 'Add New Carrier'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Carrier Name *
                </label>
                <input
                  type="text"
                  name="carrierName"
                  value={formData.carrierName}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zip Code
                </label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarrierManager;