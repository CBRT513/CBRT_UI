import React, { useState, useEffect } from 'react';
// Firebase imports
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// --- FINAL FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyAfFS_p_a_tZNTzoFZN7u7k4pA8FYdVkLk",
    authDomain: "cbrt-app-ui-dev.firebaseapp.com",
    projectId: "cbrt-app-ui-dev",
    storageBucket: "cbrt-app-ui-dev.appspot.com",
    messagingSenderId: "1087116999170",
    appId: "1:1087116999170:web:e99afb7f4d076f8d75051b",
    measurementId: "G-0ZEBLX6VX0"
};
// -------------------------------------------------------------

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Helper Icon Components ---
const UserPlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="22" x2="22" y1="8" y2="14"/><line x1="19" x2="25" y1="11" y2="11"/></svg>);
const EditIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>);
const ToggleOnIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="7" ry="7"></rect><circle cx="16" cy="12" r="3"></circle></svg>);
const ToggleOffIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="7" ry="7"></rect><circle cx="8" cy="12" r="3"></circle></svg>);
const TrashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>);


// --- Main Application Component ---
export default function App() {
  const [view, setView] = useState('products');

  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error("Anonymous sign-in failed:", err));
  }, []);

  return (
    <>
      <style>{`@tailwind base; @tailwind components; @tailwind utilities;`}</style>
      <div className="bg-[#F8F8F8] min-h-screen font-['Open_Sans',_sans-serif] text-[#4A4A4A]">
        <header className="bg-white shadow-md">
          <nav className="container mx-auto flex items-center p-4">
            <h1 className="text-xl font-bold font-['Merriweather',_serif] text-[#01522F] mr-6">CBRT App</h1>
            <div className="flex gap-4 flex-wrap">
              <NavButton text="Customers" onClick={() => setView('customers')} isActive={view === 'customers'} />
              <NavButton text="Suppliers" onClick={() => setView('suppliers')} isActive={view === 'suppliers'} />
              <NavButton text="Carriers" onClick={() => setView('carriers')} isActive={view === 'carriers'} />
              <NavButton text="Trucks" onClick={() => setView('trucks')} isActive={view === 'trucks'} />
              <NavButton text="Items" onClick={() => setView('items')} isActive={view === 'items'} />
              <NavButton text="Sizes" onClick={() => setView('sizes')} isActive={view === 'sizes'} />
              <NavButton text="Products" onClick={() => setView('products')} isActive={view === 'products'} />
              <NavButton text="Staff" onClick={() => setView('staff')} isActive={view === 'staff'} />
            </div>
          </nav>
        </header>
        <main className="container mx-auto p-4 md:p-8">
          {view === 'staff' && <StaffManager />}
          {view === 'customers' && <CustomerManager />}
          {view === 'suppliers' && <SupplierManager />}
          {view === 'carriers' && <CarrierManager />}
          {view === 'trucks' && <TruckManager />}
          {view === 'products' && <ProductManager />}
          {view === 'items' && <ItemManager />}
          {view === 'sizes' && <SizeManager />}
        </main>
      </div>
    </>
  );
}

// --- Reusable Components ---
const NavButton = ({ text, onClick, isActive }) => (<button onClick={onClick} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-[#01522F] text-white' : 'text-[#4A4A4A] hover:bg-gray-100'}`}>{text}</button>);
const PageHeader = ({ title, subtitle, buttonText, onButtonClick }) => (
  <div className="flex justify-between items-center mb-6">
    <div>
      <h2 className="text-2xl font-bold font-['Merriweather',_serif] text-[#01522F]">{title}</h2>
      <p className="text-[#4A4A4A]">{subtitle}</p>
    </div>
    {buttonText && onButtonClick &&
      <button onClick={onButtonClick} className="flex items-center gap-2 bg-[#01522F] text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:opacity-90 transition-opacity">
        <UserPlusIcon /><span>{buttonText}</span>
      </button>
    }
  </div>
);

// --- Staff Management ---
function StaffManager() { /* ... Same as previous version ... */ }
function StaffTable({ staffList, onEdit }) { /* ... Same as previous version ... */ }
function StaffModal({ staff, onClose }) { /* ... Same as previous version ... */ }

// --- Customer Management ---
function CustomerManager() { /* ... Same as previous version ... */ }
function CustomerTable({ customerList, onEdit }) { /* ... Same as previous version ... */ }
function CustomerModal({ customer, onClose }) { /* ... Same as previous version ... */ }

// --- Supplier Management ---
function SupplierManager() { /* ... Same as previous version ... */ }
function SupplierTable({ supplierList, onEdit }) { /* ... Same as previous version ... */ }
function SupplierModal({ supplier, onClose }) { /* ... Same as previous version ... */ }

// --- Carrier Management ---
function CarrierManager() { /* ... Same as previous version ... */ }
function CarrierTable({ carrierList, onEdit }) { /* ... Same as previous version ... */ }
function CarrierModal({ carrier, onClose }) { /* ... Same as previous version ... */ }

// --- Truck Management ---
function TruckManager() { /* ... Same as previous version ... */ }
function TruckTable({ truckList, carrierList, onEdit }) { /* ... Same as previous version ... */ }
function TruckModal({ truck, carrierList, onClose }) { /* ... Same as previous version ... */ }

// --- Item Management ---
function ItemManager() {
    const [itemList, setItemList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [modalKey, setModalKey] = useState(0);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'items'), (snapshot) => {
            setItemList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleOpenModal = (item = null) => {
        setCurrentItem(item);
        setModalKey(prevKey => prevKey + 1);
        setIsModalOpen(true);
    };

    return (
        <div>
            <PageHeader title="Item Management" subtitle="Manage master product items." buttonText="Add New Item" onButtonClick={() => handleOpenModal(null)} />
            {isLoading ? <p>Loading items...</p> : <ItemTable itemList={itemList} onEdit={handleOpenModal} />}
            {isModalOpen && <ItemModal key={modalKey} item={currentItem} onClose={() => setIsModalOpen(false)} itemList={itemList}/>}
        </div>
    );
}
function ItemTable({ itemList, onEdit }) {
    return (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {itemList.map(item => (
                        <tr key={item.id} className="hover:bg-[#F8F8F8]">
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{item.itemCode}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.itemName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button onClick={() => onEdit(item)} className="text-[#01522F] hover:opacity-80"><EditIcon /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
function ItemModal({ item, onClose, itemList }) {
    const [formData, setFormData] = useState({ itemCode: item?.itemCode || '', itemName: item?.itemName || '' });
    const [formError, setFormError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const isEditMode = !!item;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.itemCode.trim() || !formData.itemName.trim()) {
            setFormError('All fields are required.');
            return;
        }
        const isDuplicate = itemList.some(i => i.itemCode.toLowerCase() === formData.itemCode.toLowerCase().trim() && i.id !== item?.id);
        if (isDuplicate) {
            setFormError('An item with this code already exists.');
            return;
        }
        setIsSaving(true);
        try {
            const dataToSave = { itemCode: formData.itemCode.trim(), itemName: formData.itemName.trim() };
            if (isEditMode) await updateDoc(doc(db, 'items', item.id), dataToSave);
            else await addDoc(collection(db, 'items'), dataToSave);
            onClose();
        } catch (err) { setFormError("Failed to save item data."); } 
        finally { setIsSaving(false); }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-6 md:p-8 w-full max-w-md m-4">
                <h2 className="text-2xl font-bold font-['Merriweather',_serif] text-[#01522F] mb-4">{isEditMode ? 'Edit Item' : 'Add New Item'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input name="itemCode" value={formData.itemCode} onChange={(e) => setFormData({...formData, itemCode: e.target.value})} placeholder="Item Code" className="w-full px-3 py-2 border rounded-md" />
                    <input name="itemName" value={formData.itemName} onChange={(e) => setFormData({...formData, itemName: e.target.value})} placeholder="Item Name/Description" className="w-full px-3 py-2 border rounded-md" />
                    {formError && <p className="text-red-500">{formError}</p>}
                    <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="bg-white py-2 px-4 border rounded-md">Cancel</button><button type="submit" disabled={isSaving} className="bg-[#01522F] text-white py-2 px-4 rounded-md disabled:opacity-50">{isSaving ? 'Saving...' : 'Save'}</button></div>
                </form>
            </div>
        </div>
    );
}

// --- Size Management ---
function SizeManager() {
    const [sizeList, setSizeList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentSize, setCurrentSize] = useState(null);
    const [modalKey, setModalKey] = useState(0);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'sizes'), (snapshot) => {
            setSizeList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleOpenModal = (size = null) => {
        setCurrentSize(size);
        setModalKey(prevKey => prevKey + 1);
        setIsModalOpen(true);
    };

    return (
        <div>
            <PageHeader title="Size Management" subtitle="Manage master product sizes." buttonText="Add New Size" onButtonClick={() => handleOpenModal(null)} />
            {isLoading ? <p>Loading sizes...</p> : <SizeTable sizeList={sizeList} onEdit={handleOpenModal} />}
            {isModalOpen && <SizeModal key={modalKey} size={currentSize} onClose={() => setIsModalOpen(false)} sizeList={sizeList} />}
        </div>
    );
}
function SizeTable({ sizeList, onEdit }) {
    return (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size Name</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {sizeList.map(size => (
                        <tr key={size.id} className="hover:bg-[#F8F8F8]">
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{size.sizeName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button onClick={() => onEdit(size)} className="text-[#01522F] hover:opacity-80"><EditIcon /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
function SizeModal({ size, onClose, sizeList }) {
    const [formData, setFormData] = useState({ sizeName: size?.sizeName || '' });
    const [formError, setFormError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const isEditMode = !!size;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.sizeName.trim()) {
            setFormError('Size Name is required.');
            return;
        }
        const isDuplicate = sizeList.some(s => s.sizeName.toLowerCase() === formData.sizeName.toLowerCase().trim() && s.id !== size?.id);
        if (isDuplicate) {
            setFormError('This size already exists.');
            return;
        }
        setIsSaving(true);
        try {
            const dataToSave = { sizeName: formData.sizeName.trim() };
            if (isEditMode) await updateDoc(doc(db, 'sizes', size.id), dataToSave);
            else await addDoc(collection(db, 'sizes'), dataToSave);
            onClose();
        } catch (err) { setFormError("Failed to save size data."); } 
        finally { setIsSaving(false); }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-6 md:p-8 w-full max-w-md m-4">
                <h2 className="text-2xl font-bold font-['Merriweather',_serif] text-[#01522F] mb-4">{isEditMode ? 'Edit Size' : 'Add New Size'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input name="sizeName" value={formData.sizeName} onChange={(e) => setFormData({sizeName: e.target.value})} placeholder="Size Name (e.g., 50 lb Bag)" className="w-full px-3 py-2 border rounded-md" />
                    {formError && <p className="text-red-500">{formError}</p>}
                    <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="bg-white py-2 px-4 border rounded-md">Cancel</button><button type="submit" disabled={isSaving} className="bg-[#01522F] text-white py-2 px-4 rounded-md disabled:opacity-50">{isSaving ? 'Saving...' : 'Save'}</button></div>
                </form>
            </div>
        </div>
    );
}

// --- Product Management ---
function ProductManager() {
    const [products, setProducts] = useState([]);
    const [items, setItems] = useState([]);
    const [sizes, setSizes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [modalKey, setModalKey] = useState(0);

    useEffect(() => {
        const unsubProducts = onSnapshot(collection(db, 'products'), snapshot => setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubItems = onSnapshot(collection(db, 'items'), snapshot => setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubSizes = onSnapshot(collection(db, 'sizes'), snapshot => {
            setSizes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoading(false);
        });
        return () => { unsubProducts(); unsubItems(); unsubSizes(); };
    }, []);

    const handleOpenModal = (product = null) => {
        setCurrentProduct(product);
        setModalKey(prevKey => prevKey + 1);
        setIsModalOpen(true);
    };
    
    return (
        <div>
            <PageHeader title="Product Management" subtitle="Combine items and sizes to create final products." buttonText="Add New Product" onButtonClick={() => handleOpenModal(null)} />
            {isLoading ? <p>Loading products...</p> : <ProductTable products={products} onEdit={handleOpenModal} />}
            {isModalOpen && <ProductModal key={modalKey} product={currentProduct} items={items} sizes={sizes} products={products} onClose={() => setIsModalOpen(false)} />}
        </div>
    );
}
function ProductTable({ products, onEdit }) {
    const handleDelete = async (id) => {
        if(window.confirm('Are you sure you want to delete this product?')) {
            await deleteDoc(doc(db, 'products', id));
        }
    };
    return (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {products.map(product => (
                        <tr key={product.id} className="hover:bg-[#F8F8F8]">
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{`${product.itemCode} - ${product.itemName} (${product.sizeName})`}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.standardWeight} lbs</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                 <button onClick={() => onEdit(product)} className="text-[#01522F] hover:opacity-80 mr-4"><EditIcon /></button>
                                <button onClick={() => handleDelete(product.id)} className="text-red-500 hover:text-red-700"><TrashIcon /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
function ProductModal({ product, items, sizes, products, onClose }) {
    const [formData, setFormData] = useState({ 
        itemId: product?.itemId || '', 
        sizeId: product?.sizeId || '', 
        standardWeight: product?.standardWeight || '2200' 
    });
    const [formError, setFormError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const isEditMode = !!product;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.itemId || !formData.sizeId || !formData.standardWeight) {
            setFormError('All fields are required.');
            return;
        }
        const item = items.find(i => i.id === formData.itemId);
        const size = sizes.find(s => s.id === formData.sizeId);
        const isDuplicate = products.some(p => p.itemCode === item.itemCode && p.sizeName === size.sizeName && p.id !== product?.id);
        if (isDuplicate) {
            setFormError('This product combination already exists.');
            return;
        }
        setIsSaving(true);
        try {
            const dataToSave = { 
                itemCode: item.itemCode, 
                itemName: item.itemName, 
                sizeName: size.sizeName, 
                standardWeight: Number(formData.standardWeight) 
            };
            if (isEditMode) await updateDoc(doc(db, 'products', product.id), dataToSave);
            else await addDoc(collection(db, 'products'), dataToSave);
            onClose();
        } catch (err) { setFormError("Failed to save product data."); }
        finally { setIsSaving(false); }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-6 md:p-8 w-full max-w-md m-4">
                <h2 className="text-2xl font-bold font-['Merriweather',_serif] text-[#01522F] mb-4">{isEditMode ? 'Edit Product' : 'Add New Product'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <select name="itemId" value={formData.itemId} onChange={(e) => setFormData({...formData, itemId: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                        <option value="">Select Item</option>
                        {items.map(i => <option key={i.id} value={i.id}>{`${i.itemCode} - ${i.itemName}`}</option>)}
                    </select>
                    <select name="sizeId" value={formData.sizeId} onChange={(e) => setFormData({...formData, sizeId: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                        <option value="">Select Size</option>
                        {sizes.map(s => <option key={s.id} value={s.id}>{s.sizeName}</option>)}
                    </select>
                    <select name="standardWeight" value={formData.standardWeight} onChange={(e) => setFormData({...formData, standardWeight: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                        <option value="2200">2,200 lbs</option>
                        <option value="3300">3,300 lbs</option>
                    </select>
                    {formError && <p className="text-red-500">{formError}</p>}
                    <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="bg-white py-2 px-4 border rounded-md">Cancel</button><button type="submit" disabled={isSaving} className="bg-[#01522F] text-white py-2 px-4 rounded-md disabled:opacity-50">{isSaving ? 'Saving...' : 'Save'}</button></div>
                </form>
            </div>
        </div>
    );
}

// --- Placeholder components for Staff and Customer to keep the file self-contained ---
// In a real app, these would be in separate files.

function CustomerManager_Shell() { return <div></div> }
function CustomerTable_Shell() { return <div></div> }
function CustomerModal_Shell() { return <div></div> }
function SupplierManager_Shell() { return <div></div> }
function SupplierTable_Shell() { return <div></div> }
function SupplierModal_Shell() { return <div></div> }
function CarrierManager_Shell() { return <div></div> }
function CarrierTable_Shell() { return <div></div> }
function CarrierModal_Shell() { return <div></div> }
function TruckManager_Shell() { return <div></div> }
function TruckTable_Shell() { return <div></div> }
function TruckModal_Shell() { return <div></div> }
