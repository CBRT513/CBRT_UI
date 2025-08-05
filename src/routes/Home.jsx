// Home.jsx - Enhanced Dashboard with Clickable Sections
import React from "react";
import { Link } from "react-router-dom";
import { useFirestoreCollection } from "../hooks/useFirestore";

export default function Home() {
  const { data: releases } = useFirestoreCollection("releases");
  const { data: bols } = useFirestoreCollection("bols");
  const { data: customers } = useFirestoreCollection("customers");
  const { data: suppliers } = useFirestoreCollection("suppliers");
  const { data: items } = useFirestoreCollection("items");
  
  const openReleases = releases.filter(r => r.Status === "Available");
  const shippedToday = bols.filter(b => {
    const today = new Date().toDateString();
    return b.CreatedAt && new Date(b.CreatedAt.toDate()).toDateString() === today;
  });
  
  // Expected shipments - releases with pickup dates
  const expectedShipments = releases.filter(r => 
    r.Status === "Available" && 
    r.PickupDate && 
    new Date(r.PickupDate) >= new Date()
  ).sort((a, b) => new Date(a.PickupDate) - new Date(b.PickupDate));
  
  const hasCustomers = customers.length > 0;
  const hasSuppliers = suppliers.length > 0;
  const hasItems = items.length > 0;
  const isSetupComplete = hasCustomers && hasSuppliers && hasItems;

  const ClickableStatCard = ({ title, value, subtitle, color, icon, link, items = [] }) => (
    <Link to={link} className="block">
      <div className={"bg-white rounded-lg shadow-md p-6 border-t-4 border-" + color + "-500 hover:shadow-lg transition-all cursor-pointer"}>
        <div className="text-center">
          <div className="text-3xl mb-2">{icon}</div>
          <div className={"text-3xl font-bold text-" + color + "-600 mb-1"}>{value}</div>
          <div className="text-lg font-semibold text-gray-900 mb-2">{title}</div>
          {subtitle && <div className="text-sm text-gray-600 mb-3">{subtitle}</div>}
          
          {/* Show preview items */}
          {items.length > 0 && (
            <div className="text-xs text-gray-500 space-y-1">
              {items.slice(0, 3).map((item, i) => (
                <div key={i} className="truncate">{item}</div>
              ))}
              {items.length > 3 && <div>+{items.length - 3} more...</div>}
            </div>
          )}
          
          <div className={"text-xs font-medium text-" + color + "-600 mt-2"}>Click to view →</div>
        </div>
      </div>
    </Link>
  );

  const WorkflowCard = ({ title, description, action, link, icon, color, stats, highlight }) => (
    <div className={"bg-white rounded-lg shadow-md p-6 border-l-4 border-" + color + "-500 hover:shadow-lg transition-all" + (highlight ? " ring-2 ring-orange-200" : "")}>
      <div className="text-center">
        <div className={"text-4xl mb-3 text-" + color + "-600"}>{icon}</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        {stats && <div className="text-sm text-gray-500 mb-4">{stats}</div>}
        <Link
          to={link}
          className={"inline-flex items-center px-6 py-3 bg-" + color + "-600 text-white rounded-lg hover:bg-" + color + "-700 transition-colors font-medium"}
        >
          {action}
        </Link>
      </div>
    </div>
  );

  const ManagementCard = ({ icon, title, description, action, link, color, stats, highlight }) => (
    <div className={"bg-white rounded-lg shadow-sm p-4 border-l-4 border-" + color + "-500 hover:shadow-md transition-all" + (highlight ? " ring-1 ring-orange-200" : "")}>
      <div className="flex items-center mb-2">
        <span className={"text-xl mr-2 text-" + color + "-600"}>{icon}</span>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {highlight && <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">Setup</span>}
      </div>
      <p className="text-sm text-gray-600 mb-3">{description}</p>
      {stats && <div className="text-xs text-gray-500 mb-3">{stats}</div>}
      <Link
        to={link}
        className={"inline-flex items-center px-3 py-2 bg-" + color + "-600 text-white rounded text-sm hover:bg-" + color + "-700 transition-colors"}
      >
        {action} →
      </Link>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">🏢 CBRT Warehouse Management</h1>
        <p className="text-xl text-gray-600 mb-4">Office Dashboard - Your daily workflow guide</p>
        <div className="text-sm">
          {isSetupComplete ? (
            <span className="text-green-600 font-medium">✅ System setup complete - Ready for operations</span>
          ) : (
            <span className="text-orange-600 font-medium">⚠️ Complete setup tasks first (see Management section below)</span>
          )}
        </div>
      </div>

      {/* Quick Stats Dashboard - Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <ClickableStatCard 
          title="Open Releases" 
          value={openReleases.length} 
          color="green" 
          icon="📋" 
          link="/releases"
          subtitle="Ready for BOL generation"
          items={openReleases.map(r => "Release " + r.ReleaseNumber + " - " + r.CustomerName)}
        />
        
        <ClickableStatCard 
          title="Expected Shipments" 
          value={expectedShipments.length} 
          color="blue" 
          icon="📅" 
          link="/expected-shipments"
          subtitle="Scheduled pickups"
          items={expectedShipments.map(r => r.PickupDate + " - " + r.ReleaseNumber + " (" + r.SupplierName + ")")}
        />
        
        <ClickableStatCard 
          title="Shipped Today" 
          value={shippedToday.length} 
          color="purple" 
          icon="🚚" 
          link="/bolmanager"
          subtitle="BOLs generated today"
          items={shippedToday.map(b => "BOL " + b.BOLNumber + " - " + (b.CustomerName || "Unknown"))}
        />
      </div>

      {/* Horizontal Workflow */}
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">📋 Daily Operations Workflow</h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          <WorkflowCard
            icon="📝"
            title="STEP 1"
            description="Enter a Release"
            action="Create Release"
            link="/enterarelease"
            color="green"
            stats="Supplier → Customer → Release# → Items"
          />

          <WorkflowCard
            icon="🚛"
            title="STEP 2"
            description="Generate BOL"
            action="Generate BOL"
            link="/bolgenerator"
            color="blue"
            stats={openReleases.length > 0 ? openReleases.length + " releases ready" : "No releases ready"}
            highlight={openReleases.length > 0}
          />

          <WorkflowCard
            icon="📄"
            title="STEP 3"
            description="Track & Manage"
            action="Manage BOLs"
            link="/bolmanager"
            color="purple"
            stats={shippedToday.length > 0 ? shippedToday.length + " BOLs today" : "No BOLs today"}
          />
        </div>
      </div>

      {/* Management Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">⚙️ Setup & Management</h2>
        
        {!isSetupComplete && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-orange-800 mb-2">🚨 Setup Required</h3>
            <p className="text-orange-700 text-sm">Complete these setup tasks before processing releases:</p>
            <ul className="text-orange-700 text-sm mt-2 ml-4">
              {!hasCustomers && <li>• Add customers</li>}
              {!hasSuppliers && <li>• Add suppliers</li>}
              {!hasItems && <li>• Add items and sizes</li>}
            </ul>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ManagementCard
            icon="👥"
            title="Customers"
            description="Manage customer database"
            action="Manage"
            link="/customers"
            color={hasCustomers ? "indigo" : "orange"}
            stats={customers.length + " customers"}
            highlight={!hasCustomers}
          />

          <ManagementCard
            icon="🏢"
            title="Suppliers"
            description="Manage supplier database"
            action="Manage"
            link="/suppliers"
            color={hasSuppliers ? "indigo" : "orange"}
            stats={suppliers.length + " suppliers"}
            highlight={!hasSuppliers}
          />

          <ManagementCard
            icon="📦"
            title="Items & Products"
            description="Manage product catalog"
            action="Manage"
            link="/items"
            color={hasItems ? "yellow" : "orange"}
            stats={items.length + " items"}
            highlight={!hasItems}
          />

          <ManagementCard
            icon="🚚"
            title="Carriers & Trucks"
            description="Transportation management"
            action="Manage"
            link="/carriers"
            color="teal"
          />

          <ManagementCard
            icon="📊"
            title="Data Import"
            description="Bulk data operations"
            action="Import"
            link="/dataimport"
            color="orange"
          />

          <ManagementCard
            icon="📱"
            title="Barcodes"
            description="View barcode inventory"
            action="View"
            link="/barcodes"
            color="gray"
          />
        </div>
      </div>
    </div>
  );
}
