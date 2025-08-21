/****************************************************************************************
 *  CBRT App.jsx — Complete warehouse-management app with barcode generation + data import
 *****************************************************************************************/

/* ---------- 1. IMPORTS ---------- */
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { signInAnonymously } from 'firebase/auth';
import { auth } from './firebase/config';


// Routes
import Home from './routes/Home';
import NewRelease from './routes/NewRelease';
import Releases from "./routes/Releases";
import ExpectedShipments from "./routes/ExpectedShipments";
import DataImportManager from './pages/DataImportManager';
import BOLGenerator from "./features/bol-generation/BOLGenerator";
import BOLManager from "./managers/BOLManager";
import ReleaseDetails from './routes/ReleaseDetails';
import PDFTestPage from './routes/PDFTestPage';
import WarehouseStaging from './routes/WarehouseStaging';
import WarehouseApp from './routes/WarehouseApp';
import WarehouseVerification from './routes/WarehouseVerification';
import CustomerPortal from './routes/CustomerPortal';
import OpsQueues from './routes/OpsQueues';

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
    'Enter a Release',
    'Warehouse Staging',
    'Data Import',
    "BOL Generator",
    "BOL Manager",
    "PDF Test",
    "Warehouse App",
    "Portal"
  ];
  
  if (import.meta.env.VITE_ENABLE_SUPERSACK) {
    nav.push('Ops Queues');
  }

  return (
    <Router>
      <div className="bg-gray-50 min-h-screen font-sans text-gray-800">
        <header className="bg-white shadow sticky top-0 z-10">
          <nav className="container mx-auto flex flex-wrap gap-4 p-4 items-center">
            <h1 className="text-xl font-bold text-green-800">CBRT App</h1>
            {nav.map((l) => {
              const path = l === 'Home' ? '/' : 
                          l === 'Ops Queues' ? '/ops/queues' :
                          '/' + l.replace(/\s/g, '').toLowerCase();
              return (
                <Link
                  key={l}
                  to={path}
                  className="text-sm hover:underline"
                >
                  {l}
                </Link>
              );
            })}
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
            <Route path="/enterarelease" element={<NewRelease />} />
            <Route path="/warehousestaging" element={<WarehouseStaging />} />
            <Route path="/releases" element={<Releases />} />
            <Route path="/expected-shipments" element={<ExpectedShipments />} />
            <Route path="/dataimport" element={<DataImportManager />} />
            <Route path="/bolgenerator" element={<BOLGenerator />} />
            <Route path="/bolmanager" element={<BOLManager />} />
            <Route path="/release-details/:id" element={<ReleaseDetails />} />
            <Route path="/pdftest" element={<PDFTestPage />} />
            <Route path="/warehouseapp" element={<WarehouseApp />} />
            <Route path="/portal" element={<CustomerPortal />} />
            <Route path="/ops/queues" element={<OpsQueues />} />
            <Route path="/releases/:id" element={<ReleaseDetails />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}