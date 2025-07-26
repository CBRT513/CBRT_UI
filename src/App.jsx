/*****************************************************************************************
 *  CBRT App – full single-file version with React Router
 *  Routes: Home, Staff, Customers, Suppliers, Carriers, Trucks, Items, Sizes,
 *          Products, Releases/New, Staging, Verify, BOL
 *****************************************************************************************/

/* ---------- 1. IMPORTS ---------- */
import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Outlet,
} from 'react-router-dom';
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { getFirestore, getAuth, signInAnonymously } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
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

/* ---------- 3. SVG ICONS ---------- */
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

/* ---------- 4. APP SHELL ---------- */
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
              'Releases',
            ].map((label) => (
              <Link
                key={label}
                to={label === 'Home' ? '/' : `/${label.toLowerCase()}`}
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

/* ---------- 6. GENERIC COMPONENTS ---------- */
const PageHeader = ({ title, subtitle, buttonText, onButtonClick }) => (
  <div className="flex justify-between items-center mb-6">
    <div>
      <h2 className="text-2xl font-bold font-['Merriweather',_serif] text-[#01522F]">{title}</h2>
      <p className="text-[#4A4A4A]">{subtitle}</p>
    </div>
    {buttonText && onButtonClick && (
      <button
        onClick={onButtonClick}
        className="flex items-center gap-2 bg-[#01522F] text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:opacity-90 transition-opacity"
      >
        <UserPlusIcon />
        <span>{buttonText}</span>
      </button>
    )}
  </div>
);

/* ---------- 7. MANAGERS ---------- */
// 7.1 Staff
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

  const openModal = (s = null) => {
    setCurrent(s);
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Staff Management"
        subtitle="Manage system users and roles."
        buttonText="Add New Staff"
        onButtonClick={() => openModal()}
      />
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium">Role</th>
              <th className="px-6 py-3 text-right text-xs font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">{r.name}</td>
                <td className="px-6 py-4">{r.email}</td>
                <td className="px-6 py-4">{r.role}</td>
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
          title={`${current ? 'Edit' : 'Add'} Staff`}
          onClose={() => setOpen(false)}
          onSave={async (data) => {
            if (current?.id)
              await updateDoc(doc(db, 'staff', current.id), data);
            else await addDoc(collection(db, 'staff'), data);
            setOpen(false);
          }}
          initialData={current}
          fields={[
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'email', label: 'Email', type: 'email' },
            { name: 'role', label: 'Role', type: 'select', options: ['Admin', 'Office', 'Warehouse'] },
          ]}
        />
      )}
    </>
  );
}

// 7.2 Customer
function CustomerManager() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  useEffect(
    () =>
      onSnapshot(collection(db, 'customers'), (snap) =>
        setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
    []
  );

  const openModal = (c = null) => {
    setCurrent(c);
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Customer Management"
        subtitle="Manage customer accounts."
        buttonText="Add New Customer"
        onButtonClick={() => openModal()}
      />
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium">Contact</th>
              <th className="px-6 py-3 text-right text-xs font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">{r.name}</td>
                <td className="px-6 py-4">{r.contact}</td>
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
          title={`${current ? 'Edit' : 'Add'} Customer`}
          onClose={() => setOpen(false)}
          onSave={async (data) => {
            if (current?.id)
              await updateDoc(doc(db, 'customers', current.id), data);
            else await addDoc(collection(db, 'customers'), data);
            setOpen(false);
          }}
          initialData={current}
          fields={[
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'contact', label: 'Contact', type: 'text' },
          ]}
        />
      )}
    </>
  );
}

// 7.3 Supplier
function SupplierManager() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  useEffect(
    () =>
      onSnapshot(collection(db, 'suppliers'), (snap) =>
        setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
    []
  );

  const openModal = (s = null) => {
    setCurrent(s);
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Supplier Management"
        subtitle="Manage suppliers."
        buttonText="Add New Supplier"
        onButtonClick={() => openModal()}
      />
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium">Contact</th>
              <th className="px-6 py-3 text-right text-xs font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">{r.name}</td>
                <td className="px-6 py-4">{r.contact}</td>
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
          title={`${current ? 'Edit' : 'Add'} Supplier`}
          onClose={() => setOpen(false)}
          onSave={async (data) => {
            if (current?.id)
              await updateDoc(doc(db, 'suppliers', current.id), data);
            else await addDoc(collection(db, 'suppliers'), data);
            setOpen(false);
          }}
          initialData={current}
          fields={[
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'contact', label: 'Contact', type: 'text' },
          ]}
        />
      )}
    </>
  );
}

// 7.4 Carrier
function CarrierManager() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  useEffect(
    () =>
      onSnapshot(collection(db, 'carriers'), (snap) =>
        setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
    []
  );

  const openModal = (c = null) => {
    setCurrent(c);
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Carrier Management"
        subtitle="Manage carriers."
        buttonText="Add New Carrier"
        onButtonClick={() => openModal()}
      />
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium">Contact</th>
              <th className="px-6 py-3 text-right text-xs font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">{r.name}</td>
                <td className="px-6 py-4">{r.contact}</td>
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
          title={`${current ? 'Edit' : 'Add'} Carrier`}
          onClose={() => setOpen(false)}
          onSave={async (data) => {
            if (current?.id)
              await updateDoc(doc(db, 'carriers', current.id), data);
            else await addDoc(collection(db, 'carriers'), data);
            setOpen(false);
          }}
          initialData={current}
          fields={[
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'contact', label: 'Contact', type: 'text' },
          ]}
        />
      )}
    </>
  );
}

// 7.5 Truck
function TruckManager() {
  const [rows, setRows] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    onSnapshot(collection(db, 'carriers'), (snap) =>
      setCarriers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    onSnapshot(collection(db, 'trucks'), (snap) =>
      setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  const openModal = (t = null) => {
    setCurrent(t);
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Truck Management"
        subtitle="Manage trucks."
        buttonText="Add New Truck"
        onButtonClick={() => openModal()}
      />
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium">Unit #</th>
              <th className="px-6 py-3 text-left text-xs font-medium">Carrier</th>
              <th className="px-6 py-3 text-right text-xs font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const carrier = carriers.find((c) => c.id === r.carrierId);
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{r.unitNumber}</td>
                  <td className="px-6 py-4">{carrier?.name || '—'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openModal(r)} className="text-[#01522F]">
                      <EditIcon />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {open && (
        <Modal
          title={`${current ? 'Edit' : 'Add'} Truck`}
          onClose={() => setOpen(false)}
          onSave={async (data) => {
            if (current?.id)
              await updateDoc(doc(db, 'trucks', current.id), data);
            else await addDoc(collection(db, 'trucks'), data);
            setOpen(false);
          }}
          initialData={current}
          fields={[
            { name: 'unitNumber', label: 'Unit #', type: 'text' },
            { name: 'carrierId', label: 'Carrier', type: 'select', options: carriers },
          ]}
        />
      )}
    </>
  );
}

// 7.6 Item
function ItemManager() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  useEffect(
    () =>
      onSnapshot(collection(db, 'items'), (snap) =>
        setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
    []
  );

  const openModal = (i = null) => {
    setCurrent(i);
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Item Management"
        subtitle="Manage master product items."
        buttonText="Add New Item"
        onButtonClick={() => openModal()}
      />
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium">Item Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium">Item Name</th>
              <th className="px-6 py-3 text-right text-xs font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">{r.itemCode}</td>
                <td className="px-6 py-4">{r.itemName}</td>
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
          title={`${current ? 'Edit' : 'Add'} Item`}
          onClose={() => setOpen(false)}
          onSave={async (data) => {
            if (current?.id)
              await updateDoc(doc(db, 'items', current.id), data);
            else await addDoc(collection(db, 'items'), data);
            setOpen(false);
          }}
          initialData={current}
          fields={[
            { name: 'itemCode', label: 'Item Code', type: 'text' },
            { name: 'itemName', label: 'Item Name', type: 'text' },
          ]}
        />
      )}
    </>
  );
}

// 7.7 Size
function SizeManager() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  useEffect(
    () =>
      onSnapshot(collection(db, 'sizes'), (snap) =>
        setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
    []
  );

  const openModal = (s = null) => {
    setCurrent(s);
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Size Management"
        subtitle="Manage master product sizes."
        buttonText="Add New Size"
        onButtonClick={() => openModal()}
      />
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium">Size Name</th>
              <th className="px-6 py-3 text-right text-xs font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">{r.sizeName}</td>
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
          title={`${current ? 'Edit' : 'Add'} Size`}
          onClose={() => setOpen(false)}
          onSave={async (data) => {
            if (current?.id)
              await updateDoc(doc(db, 'sizes', current.id), data);
            else await addDoc(collection(db, 'sizes'), data);
            setOpen(false);
          }}
          initialData={current}
          fields={[
            { name: 'sizeName', label: 'Size Name', type: 'text' },
          ]}
        />
      )}
    </>
  );
}

// 7.8 Product
function ProductManager() {
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [sizes, setSizes] = useState([]);

  useEffect(() => {
    onSnapshot(collection(db, 'products'), (snap) =>
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    onSnapshot(collection(db, 'items'), (snap) =>
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    onSnapshot(collection(db, 'sizes'), (snap) =>
      setSizes(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  const openModal = (p = null) => {
    setCurrent(p);
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Product Management"
        subtitle="Combine items and sizes to create final products."
        buttonText="Add New Product"
        onButtonClick={() => openModal()}
      />
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium">Weight</th>
              <th className="px-6 py-3 text-right text-xs font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  {p.itemCode} - {p.itemName} ({p.sizeName})
                </td>
                <td className="px-6 py-4">{p.standardWeight} lbs</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => openModal(p)}
                    className="text-[#01522F] mr-2"
                  >
                    <EditIcon />
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm('Delete product?'))
                        await deleteDoc(doc(db, 'products', p.id));
                    }}
                    className="text-red-500"
                  >
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <Modal
          title={`${current ? 'Edit' : 'Add'} Product`}
          onClose={() => setOpen(false)}
          onSave={async (data) => {
            const item = items.find((i) => i.id === data.itemId);
            const size = sizes.find((s) => s.id === data.sizeId);
            const payload = {
              itemCode: item.itemCode,
              itemName: item.itemName,
              sizeName: size.sizeName,
              standardWeight: Number(data.standardWeight),
            };
            if (current?.id)
              await updateDoc(doc(db, 'products', current.id), payload);
            else await addDoc(collection(db, 'products'), payload);
            setOpen(false);
          }}
          initialData={current}
          fields={[
            { name: 'itemId', label: 'Item', type: 'select', options: items },
            { name: 'sizeId', label: 'Size', type: 'select', options: sizes },
            { name: 'standardWeight', label: 'Weight (lbs)', type: 'number' },
          ]}
        />
      )}
    </>
  );
}

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
        {/* Customer */}
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

        {/* Items */}
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

/* ---------- 9. GENERIC MODAL ---------- */
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