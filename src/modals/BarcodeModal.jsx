import React, { useState } from 'react';

export default function BarcodeModal({
  title,
  initialData,
  referenceData,
  onClose,
  onSave
}) {
  const [form, setForm] = useState(() => ({
    BargeId: initialData?.BargeId || '',
    LotId: initialData?.LotId || '',
    CustomerId: initialData?.CustomerId || '',
    ItemId: initialData?.ItemId || '',
    SizeId: initialData?.SizeId || '',
    Quantity: initialData?.Quantity ?? 1,
  }));

  const [error, setError] = useState('');

  // Live preview generator
  const generatePreview = () => {
    const barge = referenceData.barges.find(b => b.id === form.BargeId);
    const lot = referenceData.lots.find(l => l.id === form.LotId);
    const customer = referenceData.customers.find(c => c.id === form.CustomerId);
    const item = referenceData.items.find(i => i.id === form.ItemId);
    const size = referenceData.sizes.find(s => s.id === form.SizeId);

    if (!barge || !lot || !customer || !item || !size) return '';
    return `${barge.BargeName}${lot.LotNumber}${customer.CustomerName}${item.ItemCode}${size.SizeName}`
      .replace(/\s/g, '');
  };

  const handleChange = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const submit = async e => {
    e.preventDefault();
    setError('');

    // Validate required selects
    if (!form.BargeId || !form.LotId || !form.CustomerId || !form.ItemId || !form.SizeId) {
      setError('All fields are required');
      return;
    }

    try {
      await onSave(form);
    } catch (err) {
      console.error(err);
      setError('Failed to save barcode');
    }
  };

  const previewBarcode = generatePreview();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <form onSubmit={submit} className="space-y-4">
          <select
            value={form.BargeId}
            onChange={e => handleChange('BargeId', e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          >
            <option value="">Select Barge</option>
            {referenceData.barges.map(b => (
              <option key={b.id} value={b.id}>{b.BargeName}</option>
            ))}
          </select>

          <select
            value={form.LotId}
            onChange={e => handleChange('LotId', e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          >
            <option value="">Select Lot</option>
            {referenceData.lots.map(l => (
              <option key={l.id} value={l.id}>{l.LotNumber}</option>
            ))}
          </select>

          <select
            value={form.CustomerId}
            onChange={e => handleChange('CustomerId', e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          >
            <option value="">Select Customer</option>
            {referenceData.customers.map(c => (
              <option key={c.id} value={c.id}>{c.CustomerName}</option>
            ))}
          </select>

          <select
            value={form.ItemId}
            onChange={e => handleChange('ItemId', e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          >
            <option value="">Select Item</option>
            {referenceData.items.map(i => (
              <option key={i.id} value={i.id}>
                {i.ItemCode} - {i.ItemName}
              </option>
            ))}
          </select>

          <select
            value={form.SizeId}
            onChange={e => handleChange('SizeId', e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          >
            <option value="">Select Size</option>
            {referenceData.sizes.map(s => (
              <option key={s.id} value={s.id}>{s.SizeName}</option>
            ))}
          </select>

          <input
            type="number"
            min="1"
            value={form.Quantity}
            onChange={e => handleChange('Quantity', parseInt(e.target.value, 10))}
            placeholder="Quantity"
            className="w-full border px-3 py-2 rounded"
            required
          />

          {previewBarcode && (
            <div className="p-3 bg-gray-50 rounded">
              <label className="text-sm text-gray-600">Barcode Preview:</label>
              <div className="mt-1">
                <code className="bg-white px-2 py-1 rounded text-sm border">
                  {previewBarcode}
                </code>
              </div>
            </div>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-800 text-white rounded"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}