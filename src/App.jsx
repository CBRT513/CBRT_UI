/*****************************************************************************************
 *  CBRT App – complete single-file App.jsx (paste as-is)
 *****************************************************************************************/

/* ---------- 1. IMPORTS ---------- */
import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
} from 'react-router-dom';
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  getFirestore,
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { v4 as uuid } from 'uuid';

/* ---------- 2. FIREBASE CONFIG ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyAfFS_p_a_tZNTzoFZN7u7k4pA8FYdVkLk",
  authDomain: "cbrt-app-ui-dev.firebaseapp.com",
  projectId: "cbrt-app-ui-dev",
  storageBucket: "cbrt-app-ui-dev.appspot.com",
  messagingSenderId: "1087116999170",
  appId: "1:1087116999170:web:e99afb7f4d076f8d75051b",
  measurementId: "G-0ZEBLX6VX0",
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

/* ---------- 3. ICONS ---------- */
const UserPlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

/* ---------- 4. APP ---------- */
export default function App() {
  useEffect(() => { signInAnonymously(auth).catch(console.error); }, []);

  return (
    <Router>
      <div className="bg-[#F8F8F8] min-h-screen font-['Open_Sans',_sans-serif] text-[#4A4A4A]">
        <header className="bg-white shadow-md sticky top-0 z-10">
          <nav className="container mx-auto flex items-center p-4 gap-x-6 gap-y-2 flex-wrap">
            <h1 className="text-xl font-bold font-['Merriweather',_serif] text-[#01522F]">CBRT App</h1>
            {[
              'Home',
              'Staff',
              'Customers',
              'Suppliers',
              'Carriers',
              'Trucks',
              'Items',
              'Sizes',
              'Products',
              'Releases/New',
            ].map((label) => (
              <Link
                key={label}
                to={label === 'Home' ? '/' : '/' + label.replace(' ', '').toLowerCase()}
                className="text-sm hover:underline"
              >
                {label}
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
            <Route path="/releases/new" element={<NewRelease />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

/* ---------- 5. PAGES ---------- */
function Home() {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-4">CBRT Dashboard</h2>
      <p>Use the navigation bar to manage data or create releases.</p>
    </div>
  );
}

/* ---------- 6. GENERIC ---------- */
const PageHeader = ({ title, subtitle, buttonText, onButtonClick }) => (
  <div className="flex justify-between items-center mb-6">
    <div>
      <h2 className="text-2xl font-bold font-['Merriweather',_serif] text-[#01522F]">{title}</h2>
      <p className="text-[#4A4A4A]">{subtitle}</p>
    </div>
    {buttonText && onButtonClick && (
      <button
        onClick={onButtonClick}
        className="flex items-center gap-2 bg-[#01522F] text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:opacity-90"
      >
        <UserPlusIcon />
        <span>{buttonText}</span>
      </button>
    )}
  </div>
);

/* ---------- 7. MANAGERS ---------- */
function StaffManager()   { return <Manager collectionName="staff"   fields={['name','email','role']} />; }
function CustomerManager(){ return <Manager collectionName="customers" fields={['name','contact']} />; }
function SupplierManager(){ return <Manager collectionName="suppliers" fields={['name','contact']} />; }
function CarrierManager() { return <Manager collectionName="carriers"  fields={['name','contact']} />; }
function TruckManager()   { return <Manager collectionName="trucks"    fields={['unitNumber','carrierId']} />; }
function ItemManager()    { return <Manager collectionName="items"     fields={['itemCode','itemName']} />; }
function SizeManager()    { return <Manager collectionName="sizes"     fields={['sizeName']} />; }
function ProductManager() { return <Manager collectionName="products"  fields={['itemCode','itemName','sizeName','standardWeight']} />; }

/* ---------- 8. RELEASES ---------- */
function NewRelease() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ customerId: '', items: [] });

  useEffect(() => {
    onSnapshot(collection(db, 'customers'), (snap) =>
      setCustomers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    onSnapshot(collection(db, 'products'), (snap) =>
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  const addLine = () =>
    setForm({ ...form, items: [...form.items, { id: uuid(), productId: '', qty: 1 }] });

  const updateLine = (idx, key, val) => {
    const newItems = [...form.items];
    newItems[idx][key] = val;
    setForm({ ...form, items: newItems });
  };

  const removeLine = (idx) =>
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'releases'), {
      customerId: form.customerId,
      items: form.items,
      status: 'open',
      createdAt: new Date(),
    });
    alert('Release created!');
    setForm({ customerId: '', items: [] });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Create New Release (Pick Ticket)</h2>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded shadow">
        <select
          required
          value={form.customerId}
          onChange={(e) => setForm({ ...form, customerId: e.target.value })}
          className="w-full border px-3 py-2"
        >
          <option value="">Select Customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {form.items.map((line, idx) => (
          <div key={line.id} className="flex gap-2 items-center">
            <select
              required
              value={line.productId}
              onChange={(e) => updateLine(idx, 'productId', e.target.value)}
              className="flex-1 border px-3 py-2"
            >
              <option value="">Select Product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.itemCode} - {p.itemName} ({p.sizeName})
                </option>
              ))}
            </select>
            <input
              required
              type="number"
              min="1"
              value={line.qty}
              onChange={(e) => updateLine(idx, 'qty', +e.target.value)}
              className="w-20 border px-3 py-2"
            />
            <button
              type="button"
              onClick={() => removeLine(idx)}
              className="text-red-500"
            >
              <TrashIcon />
            </button>
          </div>
        ))}

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={addLine}
            className="bg-gray-200 px-3 py-1 rounded"
          >
            + Add Line
          </button>
          <button
            type="submit"
            className="bg-[#01522F] text-white px-4 py-2 rounded"
          >
            Save Release
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------- 9. GENERIC MANAGER ---------- */
function Manager({ collectionName, fields }) {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  useEffect(
    () =>
      onSnapshot(collection(db, collectionName), (snap) =>
        setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
    [collectionName]
  );

  const openModal = (r = null) => {
    setCurrent(r);
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title={`${collectionName.charAt(0).toUpperCase()}${collectionName.slice(
          1
        )} Management`}
        subtitle={`Manage ${collectionName}.`}
        buttonText={`Add New ${collectionName.charAt(0).toUpperCase()}${collectionName.slice(
          1
        )}`}
        onButtonClick={() => openModal()}
      />
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {fields.map((f) => (
                <th
                  key={f}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                >
                  {f}
                </th>
              ))}
              <th className="px-6 py-3 text-right text-xs font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                {fields.map((f) => (
                  <td key={f} className="px-6 py-4">
                    {r[f] || '—'}
                  </td>
                ))}
                <td className="px-6 py-4 text-right">
                  <button onClick={() => openModal(r)} className="text-[#01522F]">
                    <EditIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <Modal
          title={`${current ? 'Edit' : 'Add'} ${collectionName
            .charAt(0)
            .toUpperCase()}${collectionName.slice(1)}`}
          onClose={() => setOpen(false)}
          onSave={async (data) => {
            if (current?.id)
              await updateDoc(doc(db, collectionName, current.id), data);
            else await addDoc(collection(db, collectionName), data);
            setOpen(false);
          }}
          initialData={current}
          fields={fields.map((f) => ({
            name: f,
            label: f,
            type: f === 'role' ? 'select' : 'text',
            ...(f === 'role' && { options: ['Admin', 'Office', 'Warehouse'] }),
          }))}
        />
      )}
    </>
  );
}

/* ---------- 10. GENERIC MODAL ---------- */
function Modal({ title, onClose, onSave, initialData, fields }) {
  const [form, setForm] = useState(
    fields.reduce((acc, f) => {
      acc[f.name] = initialData?.[f.name] || '';
      return acc;
    }, {})
  );
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    for (const f of fields) {
      if (!form[f.name]?.toString().trim()) {
        setError(`${f.label} is required`);
        return;
      }
    }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map((f) => {
            if (f.type === 'select') {
              return (
                <select
                  key={f.name}
                  value={form[f.name]}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  className="w-full border px-3 py-2"
                >
                  <option value="">Select {f.label}</option>
                  {f.options.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              );
            } else {
              return (
                <input
                  key={f.name}
                  type={f.type}
                  placeholder={f.label}
                  value={form[f.name]}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  className="w-full border px-3 py-2"
                />
              );
            }
          })}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#01522F] text-white rounded"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}