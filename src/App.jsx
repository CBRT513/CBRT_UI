/****************************************************************************************
 *  CBRT App.jsx — Complete warehouse-management app with barcode generation + data import
 *****************************************************************************************/

/* ---------- 1. IMPORTS ---------- */
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { signInAnonymously } from 'firebase/auth';
import { auth } from './firebase/config';
import workflowMonitor from './utils/workflowMonitor';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


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

// New Workflow Routes
import ReleaseWorkflowDashboard from './routes/ReleaseWorkflowDashboard';
import WarehouseStagingNew from './routes/WarehouseStagingNew';
import WarehouseVerificationNew from './routes/WarehouseVerificationNew';
import ShipmentLoading from './routes/ShipmentLoading';
import WorkflowAutomatedTest from './tests/WorkflowAutomatedTest';
import WorkflowCompleteE2ETest from './tests/WorkflowCompleteE2ETest';
import WorkflowStressTest from './tests/WorkflowStressTest';
import ContinuousChaosTest from './tests/ContinuousChaosTest';
import AnalysisHistory from './components/AnalysisHistory';
import QuickSystemCheck from './components/QuickSystemCheck';

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

// UMS Explorer (feature-flagged)
const UmsExplorer = React.lazy(() => import('./routes/UmsExplorer'));

/* ---------- 2. APP ---------- */
export default function App() {
  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
  }, []);

  const showUms = import.meta.env.VITE_FEATURE_UMS === 'true';

  const nav = [
    'Home',
    'Workflow Dashboard',
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
    ...(showUms ? ['UMS Explorer'] : [])
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
                to={l === 'Home' ? '/' : '/' + l.replace(/\s/g, '').toLowerCase()}
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
            
            {/* New Workflow Routes */}
            <Route path="/workflow-dashboard" element={<ReleaseWorkflowDashboard />} />
            <Route path="/warehouse-staging" element={<WarehouseStagingNew />} />
            <Route path="/warehouse-verification" element={<WarehouseVerificationNew />} />
            <Route path="/shipment-loading" element={<ShipmentLoading />} />
            <Route path="/workflow-test" element={<WorkflowAutomatedTest />} />
            <Route path="/workflow-e2e-test" element={<WorkflowCompleteE2ETest />} />
            <Route path="/workflow-stress-test" element={<WorkflowStressTest />} />
            <Route path="/continuous-chaos-test" element={<ContinuousChaosTest />} />
            <Route path="/analysis-history" element={<AnalysisHistory />} />
            <Route path="/quick-system-check" element={<QuickSystemCheck />} />
            
            {/* UMS Explorer (feature-flagged) */}
            {showUms && (
              <Route path="/umsexplorer" element={
                <React.Suspense fallback={<div>Loading UMS Explorer...</div>}>
                  <UmsExplorer />
                </React.Suspense>
              } />
            )}
          </Routes>
        </main>
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </Router>
  );
}