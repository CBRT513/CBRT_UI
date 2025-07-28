/*****************************************************************************************
 *  CBRT App.jsx — Complete warehouse-management app with barcode generation
 *****************************************************************************************/

/* ---------- 1. IMPORTS ---------- */
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { signInAnonymously } from 'firebase/auth';
import { auth } from './firebase/config';

// Routes
import Home from './routes/Home';
import NewRelease from './routes/NewRelease';

// Managers
import StaffManager from './managers/StaffManager';
import CustomerManager from './managers/CustomerManager';
import SupplierManager from './managers/SupplierManager';
import CarrierManager from './managers/CarrierManager';
import TruckManager from './managers/TruckManager';
import ItemManager from './managers/ItemManager';
import SizeManager from './managers/SizeManager';
import ProductManager from './managers/ProductManager';
import BargeManager from './managers/BargeManager';
import LotManager from './managers/LotManager';
import BarcodeManager from './managers/BarcodeManager';

/* ---------- 2. APP ---------- */
export default function App() {
  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
  }, []);

  const nav = [
    'Home',
    'Staff',
    'Customers',
    'Suppliers',
    'Carriers',
    'Trucks',
    'Items',
    'Sizes',
    'Products',
    'Barges',
    'Lots',
    'Barcodes',
    'Releases/New',
  ];

  return (
    <Router>
      <div className="bg-gray-50 min-h-screen font-sans text-gray-800">
        <header className="bg-white shadow sticky top-0 z-10">
          <nav className="container mx-auto flex flex-wrap gap-4 p-4 items-center">
            <h1 className="text-xl font-bold text-green-800">CBRT App</h1>
            {nav.map((l) => (
              <Link
                key={l}
                to={l === 'Home' ? '/' : '/' + l.replace(' ', '').toLowerCase()}
                className="text-sm hover:underline"
              >
                {l}
              </Link>
            ))}
          </nav>
        </header>

        <main className="container mx-auto p-4 md:p-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/staff" element={<StaffManager />} />
            <Route path="/customers" element={<CustomerManager />} />
            <Route path="/suppliers" element={<SupplierManager />} />
            <Route path="/carriers" element={<CarrierManager />} />
            <Route path="/trucks" element={<TruckManager />} />
            <Route path="/items" element={<ItemManager />} />
            <Route path="/sizes" element={<SizeManager />} />
            <Route path="/products" element={<ProductManager />} />
            <Route path="/barges" element={<BargeManager />} />
            <Route path="/lots" element={<LotManager />} />
            <Route path="/barcodes" element={<BarcodeManager />} />
            <Route path="/releases/new" element={<NewRelease />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

/* ---------- 6. GENERIC MANAGER ---------- */
function Manager({ collectionName, fields }) {
  const [rows, setRows]   = useState([]);
  const [open, setOpen]   = useState(false);
  const [current, setCurrent] = useState(null);

  useEffect(
    () =>
      onSnapshot(collection(db, collectionName), (snap) =>
        setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
    [collectionName]
  );

  const getValue = (obj, path) =>
    path.split('.').reduce((o, k) => (o && k in o ? o[k] : undefined), obj);

  return (
    <>
      <PageHeader
        title={`${collectionName[0].toUpperCase()}${collectionName.slice(1)} Management`}
        subtitle={`Manage ${collectionName}`}
        buttonText={`Add New ${collectionName.slice(0, -1)}`}
        onAdd={() => {
          setCurrent(null);
          setOpen(true);
        }}
      />

      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600">
            <tr>
              {fields.map((f) => (
                <th key={f.name} className="px-6 py-3 text-left">
                  {f.label}
                </th>
              ))}
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                {fields.map((f) => (
                  <td key={f.name} className="px-6 py-4">
                    {getValue(r, f.name) ?? '—'}
                  </td>
                ))}
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
                        if (window.confirm('Are you sure you want to delete this item?')) {
                          await deleteDoc(doc(db, collectionName, r.id));
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
      </div>

      {open && (
        <Modal
          title={`${current ? 'Edit' : 'Add'} ${collectionName.slice(0, -1)}`}
          fields={fields}
          initialData={current}
          onClose={() => setOpen(false)}
          onSave={async (data) => {
            if (current?.id) {
              await updateDoc(doc(db, collectionName, current.id), data);
            } else {
              await addDoc(collection(db, collectionName), data);
            }
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

/* ---------- 7. TRUCKS WITH CARRIER NAMES ---------- */
function useTrucksWithCarriers() {
  const [trucks, setTrucks] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let trucksData = [], carriersData = [];
    const update = () => {
      if (!carriersData.length) return;
      setTrucks(
        trucksData.map((t) => ({
          ...t,
          CarrierName: carriersData.find((c) => c.id === t.Carrier)?.name || 'Unknown Carrier',
        }))
      );
      setIsLoading(false);
    };

    const unsubC = onSnapshot(collection(db, 'carriers'), (snap) => {
      carriersData = snap.docs.map((d) => ({ id: d.id, name: d.data().CarrierName }));
      update();
    });
    const unsubT = onSnapshot(collection(db, 'trucks'), (snap) => {
      trucksData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      update();
    });

    return () => {
      unsubC();
      unsubT();
    };
  }, []);

  return { trucks, carriers, isLoading };
}

function TruckManager() {
  const { trucks, carriers, isLoading } = useTrucksWithCarriers();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  const fields = [
    { name: 'TruckNumber', label: 'Truck Number', type: 'text' },
    { name: 'TrailerNumber', label: 'Trailer Number', type: 'text' },
    { name: 'CarrierName', label: 'Carrier', type: 'display' },
    { name: 'Status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-48"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Trucks Management"
        subtitle="Manage trucks"
        buttonText="Add New truck"
        onAdd={() => {
          setCurrent(null);
          setOpen(true);
        }}
      />
      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600">
            <tr>
              {fields.map((f) => (
                <th key={f.name} className="px-6 py-3 text-left">
                  {f.label}
                </th>
              ))}
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {trucks.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                {fields.map((f) => (
                  <td key={f.name} className="px-6 py-4">
                    {r[f.name] ?? '—'}
                  </td>
                ))}
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
                        if (window.confirm('Are you sure you want to delete this truck?')) {
                          await deleteDoc(doc(db, 'trucks', r.id));
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
      </div>

      {open && (
        <Modal
          title={`${current ? 'Edit' : 'Add'} truck`}
          fields={[
            { name: 'TruckNumber', label: 'Truck Number', type: 'text' },
            { name: 'TrailerNumber', label: 'Trailer Number', type: 'text' },
            { name: 'Carrier', label: 'Carrier', type: 'select', options: carriers },
            { name: 'Status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
          ]}
          initialData={current}
          onClose={() => setOpen(false)}
          onSave={async (data) => {
            if (current?.id) {
              await updateDoc(doc(db, 'trucks', current.id), data);
            } else {
              await addDoc(collection(db, 'trucks'), data);
            }
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

/* ---------- 8. CSV UPLOAD ---------- */
function ItemUploadModal({ onClose, onUpload }) {
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [mappedData, setMappedData] = useState([]);
  const [errors, setErrors] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      parseCSV(selectedFile);
    } else {
      alert('Please select a CSV file');
    }
  };

  const parseCSV = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map((h) => h.trim());

      const data = lines
        .slice(1)
        .filter((line) => line.trim())
        .map((line) => {
          const values = line.split(',').map((v) => v.trim());
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });

      setCsvData(data);
      mapCSVData(data);
    };
    reader.readAsText(file);
  };

  const mapCSVData = (data) => {
    const mapped = [];
    const errorList = [];

    data.forEach((row, index) => {
      const lineNumber = index + 2;
      const errs = [];
      if (!row.ItemCode?.trim()) errs.push('ItemCode is required');
      if (!row.ItemName?.trim()) errs.push('ItemName is required');

      if (errs.length) {
        errorList.push({ line: lineNumber, errors: errs });
      } else {
        mapped.push({
          ItemCode: row.ItemCode.trim(),
          ItemName: row.ItemName.trim(),
          Status: row.Status || 'Active',
        });
      }
    });

    setMappedData(mapped);
    setErrors(errorList);
  };

  const handleUpload = async () => {
    if (!mappedData.length) {
      alert('No valid data to upload');
      return;
    }
    setIsProcessing(true);
    try {
      await onUpload(mappedData);
      alert(`Successfully uploaded ${mappedData.length} items!`);
      onClose();
    } catch (error) {
      alert('Error uploading data: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Upload Items from CSV</h2>
        <div className="mb-4 p-4 bg-blue-50 rounded">
          <h3 className="font-semibold mb-2">CSV Format Required:</h3>
          <code className="text-sm">ItemCode,ItemName,Status</code>
          <p className="text-sm text-gray-600 mt-2">
            • ItemCode and ItemName are required
            <br />• Status defaults to Active if not provided
            <br />• Example: BX85,Bauxite 85,Active
          </p>
        </div>

        <div className="mb-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        {errors.length > 0 && (
          <div className="mb-4 p-4 bg-red-50 rounded">
            <h3 className="font-semibold text-red-800 mb-2">Errors Found:</h3>
            {errors.map((err, i) => (
              <div key={i} className="text-sm text-red-600">
                Line {err.line}: {err.errors.join(', ')}
              </div>
            ))}
          </div>
        )}

        {mappedData.length > 0 && (
          <div className="mb-4 p-4 bg-green-50 rounded">
            <h3 className="font-semibold text-green-800 mb-2">
              Ready to Upload: {mappedData.length} valid records
            </h3>
            <div className="max-h-40 overflow-y-auto">
              {mappedData.slice(0, 10).map((item, i) => (
                <div key={i} className="text-sm text-green-600">
                  {item.ItemCode} - {item.ItemName} ({item.Status})
                </div>
              ))}
              {mappedData.length > 10 && (
                <div className="text-sm text-green-600">
                  ... and {mappedData.length - 10} more records
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!mappedData.length || isProcessing}
            className="px-4 py-2 bg-green-800 text-white rounded disabled:opacity-50"
          >
            {isProcessing ? 'Uploading...' : `Upload ${mappedData.length} Items`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- 9. SPECIFIC MANAGERS ---------- */
function StaffManager() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  useEffect(
    () =>
      onSnapshot(collection(db, 'staff'), (snap) =>
        setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
    []
  );

  const fields = [
    { name: 'name', label: 'Name', type: 'text' },
    { name: 'email', label: 'Email', type: 'text' },
    { name: 'role', label: 'Role', type: 'select', options: ['Admin', 'Office', 'Warehouse'] },
    { name: 'authType', label: 'Auth Type', type: 'display' },
    { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
  ];

  return (
    <>
      <PageHeader
        title="Staff Management"
        subtitle="Manage staff"
        buttonText="Add New staff"
        onAdd={() => {
          setCurrent(null);
          setOpen(true);
        }}
      />
      <Manager collectionName="staff" fields={fields} />
    </>
  );
}

function CustomerManager() {
  return (
    <Manager
      collectionName="customers"
      fields={[
        { name: 'CustomerName', label: 'Customer Name', type: 'text' },
        { name: 'ShippingAddress', label: 'Shipping Address', type: 'text' },
        { name: 'ShippingCity', label: 'Shipping City', type: 'text' },
        { name: 'ShippingState', label: 'Shipping State', type: 'text' },
        { name: 'ShippingZip', label: 'Shipping Zip', type: 'text' },
        { name: 'Status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
      ]}
    />
  );
}

function SupplierManager() {
  return (
    <Manager
      collectionName="suppliers"
      fields={[
        { name: 'SupplierName', label: 'Supplier Name', type: 'text' },
        { name: 'BOLPrefix', label: 'BOL Prefix', type: 'text' },
        { name: 'Status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
      ]}
    />
  );
}

function CarrierManager() {
  return (
    <Manager
      collectionName="carriers"
      fields={[
        { name: 'CarrierName', label: 'Carrier Name', type: 'text' },
        { name: 'Status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
      ]}
    />
  );
}

function ItemManager() {
  const [uploadOpen, setUploadOpen] = useState(false);
  return (
    <>
      <PageHeader
        title="Items Management"
        subtitle="Manage items"
        buttonText="Add New Item"
        onAdd={() => {}}
      />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-green-800">Items Management</h2>
          <p className="text-gray-600">Manage items</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded shadow hover:opacity-90"
          >
            📁 Upload CSV
          </button>
          <button
            onClick={() => {}}
            className="flex items-center gap-2 bg-green-800 text-white px-4 py-2 rounded shadow hover:opacity-90"
          >
            <PlusIcon /> Add New Item
          </button>
        </div>
      </div>
      <Manager
        collectionName="items"
        fields={[
          { name: 'ItemCode', label: 'Item Code', type: 'text' },
          { name: 'ItemName', label: 'Item Name', type: 'text' },
          { name: 'Status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
        ]}
      />
      {uploadOpen && (
        <ItemUploadModal
          onClose={() => setUploadOpen(false)}
          onUpload={async (items) => {
            const promises = items.map((item) => addDoc(collection(db, 'items'), item));
            await Promise.all(promises);
            setUploadOpen(false);
          }}
        />
      )}
    </>
  );
}

function SizeManager() {
  return (
    <Manager
      collectionName="sizes"
      fields={[
        { name: 'SizeName', label: 'Size Name', type: 'text' },
        { name: 'SizeType', label: 'Size Type', type: 'select', options: ['Dimensional', 'Mesh', 'Special'] },
        { name: 'SortOrder', label: 'Sort Order', type: 'number' },
        { name: 'Status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
      ]}
    />
  );
}

/* ---------- 10. PRODUCT MANAGER ---------- */
function ProductManager() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [items, setItems] = useState([]);
  const [sizes, setSizes] = useState([]);

  useEffect(() => {
    const unsubI = onSnapshot(collection(db, 'items'), (snap) =>
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubS = onSnapshot(collection(db, 'sizes'), (snap) =>
      setSizes(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => {
      unsubI();
      unsubS();
    };
  }, []);

  useEffect(() => {
    if (!items.length || !sizes.length) return;
    return onSnapshot(collection(db, 'products'), (snap) => {
      const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRows(
        products.map((p) => ({
          ...p,
          ItemCodeDisplay: items.find((i) => i.id === p.ItemId)?.ItemCode || 'Unknown',
          ItemNameDisplay: items.find((i) => i.id === p.ItemId)?.ItemName || 'Unknown',
          SizeNameDisplay: sizes.find((s) => s.id === p.SizeId)?.SizeName || 'Unknown',
        }))
      );
    });
  }, [items, sizes]);

  const fields = [
    { name: 'ItemCodeDisplay', label: 'Item Code', type: 'display' },
    { name: 'ItemNameDisplay', label: 'Item Name', type: 'display' },
    { name: 'SizeNameDisplay', label: 'Size', type: 'display' },
    { name: 'StandardWeight', label: 'Standard Weight (lbs)', type: 'number' },
    { name: 'Status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
  ];

  if (!items.length || !sizes.length) {
    return <div className="flex justify-center p-8">Loading products...</div>;
  }

  return (
    <>
      <PageHeader
        title="Products Management"
        subtitle="Manage item + size + weight combinations"
        buttonText="Add New Product"
        onAdd={() => {
          setCurrent(null);
          setOpen(true);
        }}
      />
      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600">
            <tr>
              {fields.map((f) => (
                <th key={f.name} className="px-6 py-3 text-left">
                  {f.label}
                </th>
              ))}
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                {fields.map((f) => (
                  <td key={f.name} className="px-6 py-4">
                    {r[f.name] ?? '—'}
                  </td>
                ))}
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
                        if (window.confirm('Are you sure you want to delete this product?')) {
                          await deleteDoc(doc(db, 'products', r.id));
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
      </div>

      {open && (
        <Modal
          title={`${current ? 'Edit' : 'Add'} Product`}
          fields={[
            {
              name: 'ItemId',
              label: 'Item',
              type: 'select',
              options: items.map((i) => ({ id: i.id, name: `${i.ItemCode} - ${i.ItemName}` })),
            },
            {
              name: 'SizeId',
              label: 'Size',
              type: 'select',
              options: sizes.map((s) => ({ id: s.id, name: s.SizeName })),
            },
            { name: 'StandardWeight', label: 'Standard Weight (lbs)', type: 'number' },
            { name: 'Status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
          ]}
          initialData={current}
          onClose={() => setOpen(false)}
          onSave={async (data) => {
            if (current?.id) {
              await updateDoc(doc(db, 'products', current.id), data);
            } else {
              await addDoc(collection(db, 'products'), data);
            }
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

/* ---------- 11. BARGE MANAGER ---------- */
function BargeManager() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    return onSnapshot(collection(db, 'suppliers'), (snap) =>
      setSuppliers(snap.docs.map((d) => ({ id: d.id, name: d.data().SupplierName })))
    );
  }, []);

  useEffect(() => {
    if (!suppliers.length) return;
    return onSnapshot(collection(db, 'barges'), (snap) => {
      const barges = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRows(
        barges.map((b) => ({
          ...b,
          SupplierName: suppliers.find((s) => s.id === b.SupplierId)?.name || 'Unknown Supplier',
          ArrivalDateFormatted: b.ArrivalDate
            ? new Date(
                b.ArrivalDate.seconds ? b.ArrivalDate.seconds * 1000 : b.ArrivalDate
              ).toLocaleDateString()
            : '—',
        }))
      );
    });
  }, [suppliers]);

  const fields = [
    { name: 'BargeName', label: 'Barge Name', type: 'text' },
    { name: 'SupplierName', label: 'Supplier', type: 'display' },
    { name: 'ArrivalDateFormatted', label: 'Arrival Date', type: 'display' },
    { name: 'Status', label: 'Status', type: 'select', options: ['Expected', 'Arrived', 'Processing', 'Complete'] },
  ];

  if (!suppliers.length) {
    return <div className="flex justify-center p-8">Loading barges...</div>;
  }

  return (
    <>
      <PageHeader
        title="Barges Management"
        subtitle="Manage incoming barges"
        buttonText="Add New Barge"
        onAdd={() => {
          setCurrent(null);
          setOpen(true);
        }}
      />
      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600">
            <tr>
              {fields.map((f) => (
                <th key={f.name} className="px-6 py-3 text-left">
                  {f.label}
                </th>
              ))}
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                {fields.map((f) => (
                  <td key={f.name} className="px-6 py-4">
                    {r[f.name] ?? '—'}
                  </td>
                ))}
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
                        if (window.confirm('Are you sure you want to delete this barge?')) {
                          await deleteDoc(doc(db, 'barges', r.id));
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
      </div>

      {open && (
        <Modal
          title={`${current ? 'Edit' : 'Add'} Barge`}
          fields={[
            { name: 'BargeName', label: 'Barge Name', type: 'text' },
            { name: 'SupplierId', label: 'Supplier', type: 'select', options: suppliers },
            { name: 'ArrivalDate', label: 'Arrival Date', type: 'date' },
            { name: 'Status', label: 'Status', type: 'select', options: ['Expected', 'Arrived', 'Processing', 'Complete'] },
            { name: 'Notes', label: 'Notes', type: 'text' },
          ]}
          initialData={current}
          onClose={() => setOpen(false)}
          onSave={async (data) => {
            if (data.ArrivalDate) data.ArrivalDate = new Date(data.ArrivalDate);
            if (current?.id) {
              await updateDoc(doc(db, 'barges', current.id), data);
            } else {
              await addDoc(collection(db, 'barges'), data);
            }
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

/* ---------- 12. LOT MANAGER ---------- */
function LotManager() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [barges, setBarges] = useState([]);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    const unsubB = onSnapshot(collection(db, 'barges'), (snap) =>
      setBarges(snap.docs.map((d) => ({ id: d.id, name: d.data().BargeName })))
    );
    const unsubC = onSnapshot(collection(db, 'customers'), (snap) =>
      setCustomers(snap.docs.map((d) => ({ id: d.id, name: d.data().CustomerName })))
    );
    return () => {
      unsubB();
      unsubC();
    };
  }, []);

  useEffect(() => {
    if (!barges.length || !customers.length) return;
    return onSnapshot(collection(db, 'lots'), (snap) => {
      const lots = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRows(
        lots.map((l) => ({
          ...l,
          BargeName: barges.find((b) => b.id === l.BargeId)?.name || 'Unknown',
          CustomerName: customers.find((c) => c.id === l.CustomerId)?.name || 'Unknown',
        }))
      );
    });
  }, [barges, customers]);

  const fields = [
    { name: 'LotNumber', label: 'Lot Number', type: 'text' },
    { name: 'BargeName', label: 'Barge', type: 'display' },
    { name: 'CustomerName', label: 'Customer', type: 'display' },
    { name: 'Status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
  ];

  if (!barges.length || !customers.length) {
    return <div className="flex justify-center p-8">Loading lots...</div>;
  }

  return (
    <>
      <PageHeader
        title="Lots Management"
        subtitle="Manage lot numbers for barge/customer combinations"
        buttonText="Add New Lot"
        onAdd={() => {
          setCurrent(null);
          setOpen(true);
        }}
      />
      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600">
            <tr>
              {fields.map((f) => (
                <th key={f.name} className="px-6 py-3 text-left">
                  {f.label}
                </th>
              ))}
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                {fields.map((f) => (
                  <td key={f.name} className="px-6 py-4">
                    {r[f.name] ?? '—'}
                  </td>
                ))}
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
                        if (window.confirm('Are you sure you want to delete this lot?')) {
                          await deleteDoc(doc(db, 'lots', r.id));
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
      </div>

      {open && (
        <Modal
          title={`${current ? 'Edit' : 'Add'} Lot`}
          fields={[
            { name: 'LotNumber', label: 'Lot Number', type: 'text' },
            { name: 'BargeId', label: 'Barge', type: 'select', options: barges },
            { name: 'CustomerId', label: 'Customer', type: 'select', options: customers },
            { name: 'Status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
            { name: 'Notes', label: 'Notes', type: 'text' },
          ]}
          initialData={current}
          onClose={() => setOpen(false)}
          onSave={async (data) => {
            if (current?.id) {
              await updateDoc(doc(db, 'lots', current.id), data);
            } else {
              await addDoc(collection(db, 'lots'), data);
            }
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

/* ---------- 13. BARCODE MANAGER ---------- */
function BarcodeManager() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  const [refData, setRefData] = useState({
    barges: [],
    lots: [],
    customers: [],
    items: [],
    sizes: [],
  });

  // load reference collections
  useEffect(() => {
    const collections = ['barges', 'lots', 'customers', 'items', 'sizes'];
    const unsubscribers = collections.map((name) =>
      onSnapshot(collection(db, name), (snap) =>
        setRefData((prev) => ({ ...prev, [name]: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }))
      )
    );
    return () => unsubscribers.forEach((u) => u());
  }, []);

  // generate barcode string
  const genBarcode = (barge, lot, customer, item, size) =>
    `${barge?.BargeName || ''}${lot?.LotNumber || ''}${customer?.CustomerName || ''}${item?.ItemCode || ''}${size?.SizeName || ''}`.replace(/\s/g, '');

  // load barcodes with names
  useEffect(() => {
    const { barges, lots, customers, items, sizes } = refData;
    if (!barges.length || !lots.length || !customers.length || !items.length || !sizes.length) return;

    return onSnapshot(collection(db, 'barcodes'), (snap) => {
      const barcodes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRows(
        barcodes.map((b) => {
          const barge = barges.find((x) => x.id === b.BargeId);
          const lot = lots.find((x) => x.id === b.LotId);
          const customer = customers.find((x) => x.id === b.CustomerId);
          const item = items.find((x) => x.id === b.ItemId);
          const size = sizes.find((x) => x.id === b.SizeId);

          return {
            ...b,
            BargeName: barge?.BargeName || 'Unknown',
            LotNumber: lot?.LotNumber || 'Unknown',
            CustomerName: customer?.CustomerName || 'Unknown',
            ItemCode: item?.ItemCode || 'Unknown',
            ItemName: item?.ItemName || 'Unknown',
            SizeName: size?.SizeName || 'Unknown',
            GeneratedBarcode: genBarcode(barge, lot, customer, item, size),
          };
        })
      );
    });
  }, [refData]);

  const fields = [
    { name: 'BargeName', label: 'Barge', type: 'display' },
    { name: 'LotNumber', label: 'Lot #', type: 'display' },
    { name: 'CustomerName', label: 'Customer', type: 'display' },
    { name: 'ItemCode', label: 'Item', type: 'display' },
    { name: 'SizeName', label: 'Size', type: 'display' },
    { name: 'GeneratedBarcode', label: 'Barcode', type: 'display' },
    { name: 'Quantity', label: 'Qty', type: 'number' },
  ];

  const ready = Object.values(refData).every((arr) => arr.length);
  if (!ready) return <div className="flex justify-center p-8">Loading barcodes...</div>;

  /* ---------- 13. BARCODE MANAGER (FIXED) ---------- */
function BarcodeManager() {
  /* ...hooks & logic unchanged... */

  return (
    <>
      <PageHeader
        title="Barcodes Management"
        subtitle="Manage generated barcodes"
        buttonText="Add New Barcode"
        onAdd={() => {
          setCurrent(null);
          setOpen(true);
        }}
      />
      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600">
            <tr>
              {fields.map((f) => (
                <th key={f.name} className="px-6 py-3 text-left">
                  {f.label}
                </th>
              ))}
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                {fields.map((f) => (
                  <td key={f.name} className="px-6 py-4 text-sm">
                    {f.name === 'GeneratedBarcode' ? (
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                        {r[f.name]}
                      </code>
                    ) : (
                      r[f.name] ?? '—'
                    )}
                  </td>
                ))}
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
                        if (window.confirm('Are you sure you want to delete this barcode?')) {
                          await deleteDoc(doc(db, 'barcodes', r.id));
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
      </div>

      {open && (
        <BarcodeModal
          title={`${current ? 'Edit' : 'Add'} Barcode`}
          initialData={current}
          referenceData={refData}
          onClose={() => setOpen(false)}
          onSave={async (data) => {
            if (current?.id) {
              await updateDoc(doc(db, 'barcodes', current.id), data);
            } else {
              await addDoc(collection(db, 'barcodes'), data);
            }
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

/* ---------- 14. BARCODE MODAL ---------- */
function BarcodeModal({ title, onClose, onSave, initialData, referenceData }) {
  const [form, setForm] = useState(() => ({
    BargeId: initialData?.BargeId || '',
    LotId: initialData?.LotId || '',
    CustomerId: initialData?.CustomerId || '',
    ItemId: initialData?.ItemId || '',
    SizeId: initialData?.SizeId || '',
    Quantity: initialData?.Quantity || 1,
  }));
  const [error, setError] = useState('');

  const generatePreview = () => {
    const barge = referenceData.barges.find((b) => b.id === form.BargeId);
    const lot = referenceData.lots.find((l) => l.id === form.LotId);
    const customer = referenceData.customers.find((c) => c.id === form.CustomerId);
    const item = referenceData.items.find((i) => i.id === form.ItemId);
    const size = referenceData.sizes.find((s) => s.id === form.SizeId);
    if (!barge || !lot || !customer || !item || !size) return '';
    return `${barge.BargeName}${lot.LotNumber}${customer.CustomerName}${item.ItemCode}${size.SizeName}`.replace(/\s/g, '');
  };

  const handleChange = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.BargeId || !form.LotId || !form.CustomerId || !form.ItemId || !form.SizeId) {
      setError('All fields are required');
      return;
    }
    try {
      onSave(form);
    } catch (err) {
      setError('Failed to save barcode');
      console.error(err);
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
            onChange={(e) => handleChange('BargeId', e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          >
            <option value="">Select Barge</option>
            {referenceData.barges.map((b) => (
              <option key={b.id} value={b.id}>
                {b.BargeName}
              </option>
            ))}
          </select>

          <select
            value={form.LotId}
            onChange={(e) => handleChange('LotId', e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          >
            <option value="">Select Lot</option>
            {referenceData.lots.map((l) => (
              <option key={l.id} value={l.id}>
                {l.LotNumber}
              </option>
            ))}
          </select>

          <select
            value={form.CustomerId}
            onChange={(e) => handleChange('CustomerId', e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          >
            <option value="">Select Customer</option>
            {referenceData.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.CustomerName}
              </option>
            ))}
          </select>

          <select
            value={form.ItemId}
            onChange={(e) => handleChange('ItemId', e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          >
            <option value="">Select Item</option>
            {referenceData.items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.ItemCode} - {i.ItemName}
              </option>
            ))}
          </select>

          <select
            value={form.SizeId}
            onChange={(e) => handleChange('SizeId', e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          >
            <option value="">Select Size</option>
            {referenceData.sizes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.SizeName}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="1"
            placeholder="Quantity"
            value={form.Quantity}
            onChange={(e) => handleChange('Quantity', parseInt(e.target.value))}
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
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-green-800 text-white rounded">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------- 15. NEW RELEASE ---------- */
function NewRelease() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ customerId: '', items: [] });

  useEffect(() => {
    onSnapshot(collection(db, 'customers'), (s) =>
      setCustomers(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    onSnapshot(collection(db, 'products'), (s) =>
      setProducts(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  const addLine = () =>
    setForm((f) => ({ ...f, items: [...f.items, { id: uuid(), productId: '', qty: 1 }] }));
  const updateLine = (idx, key, val) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((l, i) => (i === idx ? { ...l, [key]: val } : l)),
    }));
  const removeLine = (idx) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const submit = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'releases'), {
      ...form,
      status: 'open',
      createdAt: new Date(),
    });
    alert('Release created!');
    setForm({ customerId: '', items: [] });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Create New Release</h2>
      <form onSubmit={submit} className="bg-white shadow rounded p-6 space-y-4">
        <select
          required
          value={form.customerId}
          onChange={(e) => setForm({ ...form, customerId: e.target.value })}
          className="w-full border px-3 py-2"
        >
          <option value="">Select Customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.CustomerName}
            </option>
          ))}
        </select>

        {form.items.map((l, idx) => (
          <div key={l.id} className="flex gap-2 items-center">
            <select
              required
              value={l.productId}
              onChange={(e) => updateLine(idx, 'productId', e.target.value)}
              className="flex-1 border px-3 py-2"
            >
              <option value="">Select Product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.ItemCode} - {p.ItemName} ({p.SizeName})
                </option>
              ))}
            </select>
            <input
              required
              type="number"
              min={1}
              value={l.qty}
              onChange={(e) => updateLine(idx, 'qty', +e.target.value)}
              className="w-20 border px-3 py-2"
            />
            <button type="button" onClick={() => removeLine(idx)} className="text-red-600 text-xl">
              ×
            </button>
          </div>
        ))}

        <div className="flex justify-between items-center">
          <button type="button" onClick={addLine} className="border px-3 py-1 rounded">
            + Line
          </button>
          <button type="submit" className="bg-green-800 text-white px-4 py-2 rounded">
            Save Release
          </button>
        </div>
      </form>
    </div>
  );
}