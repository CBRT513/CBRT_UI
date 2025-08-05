// File: /Users/cerion/CBRT_UI/src/constants/index.js

// Collections used throughout the application
export const COLLECTIONS = {
  STAFF: 'staff',
  CUSTOMERS: 'customers',
  SUPPLIERS: 'suppliers',
  CARRIERS: 'carriers',
  TRUCKS: 'trucks',
  ITEMS: 'items',
  SIZES: 'sizes',
  PRODUCTS: 'products',
  BARGES: 'barges',
  LOTS: 'lots',
  BARCODES: 'barcodes',
  RELEASES: 'releases',
  BOLS: 'bols'
};

// Status options used across the application
export const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' }
];

// Authentication types for staff
export const AUTH_TYPES = [
  { value: 'Google', label: 'Google OAuth' },
  { value: 'PIN', label: 'PIN Authentication' }
];

// Entity field definitions for forms and modals
export const ENTITY_FIELDS = {
  staff: [
    {
      name: 'Name',
      label: 'Name',
      type: 'text',
      required: true
    },
    {
      name: 'Role',
      label: 'Role',
      type: 'select',
      options: [
        { value: 'Admin', label: 'Admin (Full Access)' },
        { value: 'Office', label: 'Office (Management Access)' },
        { value: 'Warehouse', label: 'Warehouse (Limited Access)' }
      ],
      required: true
    },
    {
      name: 'Email',
      label: 'Email',
      type: 'email',
      required: false
    },
    {
      name: 'Phone',
      label: 'Phone Number',
      type: 'tel',
      required: false
    },
    {
      name: 'ReceivesNewRelease',
      label: 'Receives New Release Notifications',
      type: 'checkbox',
      required: false,
      defaultValue: false
    },
    {
      name: 'AuthType',
      label: 'Authentication Type',
      type: 'select',
      options: AUTH_TYPES,
      defaultValue: 'Google',
      required: true
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: STATUS_OPTIONS,
      defaultValue: 'Active',
      required: true
    }
  ],

  customer: [
    {
      name: 'CustomerName',
      label: 'Customer Name',
      type: 'text',
      required: true
    },
    {
      name: 'ContactName',
      label: 'Contact Name',
      type: 'text',
      required: false
    },
    {
      name: 'Phone',
      label: 'Phone',
      type: 'tel',
      required: false
    },
    {
      name: 'Address',
      label: 'Address',
      type: 'text',
      required: false
    },
    {
      name: 'City',
      label: 'City',
      type: 'text',
      required: false
    },
    {
      name: 'State',
      label: 'State',
      type: 'text',
      required: false
    },
    {
      name: 'ZipCode',
      label: 'Zip Code',
      type: 'text',
      required: false
    },
    {
      name: 'Status',
      label: 'Status',
      type: 'select',
      options: STATUS_OPTIONS,
      defaultValue: 'Active',
      required: true
    }
  ],

  supplier: [
    {
      name: 'SupplierName',
      label: 'Supplier Name',
      type: 'text',
      required: true
    },
    {
      name: 'BOLPrefix',
      label: 'BOL Prefix',
      type: 'text',
      required: true
    },
    {
      name: 'ContactName',
      label: 'Contact Name',
      type: 'text',
      required: false
    },
    {
      name: 'Phone',
      label: 'Phone',
      type: 'tel',
      required: false
    },
    {
      name: 'Email',
      label: 'Email',
      type: 'email',
      required: false
    },
    {
      name: 'Status',
      label: 'Status',
      type: 'select',
      options: STATUS_OPTIONS,
      defaultValue: 'Active',
      required: true
    }
  ],

  carrier: [
    {
      name: 'CarrierName',
      label: 'Carrier Name',
      type: 'text',
      required: true
    },
    {
      name: 'ContactName',
      label: 'Contact Name',
      type: 'text',
      required: false
    },
    {
      name: 'Phone',
      label: 'Phone',
      type: 'tel',
      required: false
    },
    {
      name: 'Email',
      label: 'Email',
      type: 'email',
      required: false
    },
    {
      name: 'Status',
      label: 'Status',
      type: 'select',
      options: STATUS_OPTIONS,
      defaultValue: 'Active',
      required: true
    }
  ],

  truck: [
    {
      name: 'CarrierId',
      label: 'Carrier',
      type: 'select',
      required: true,
      collection: 'carriers',
      displayField: 'CarrierName'
    },
    {
      name: 'TruckNumber',
      label: 'Truck Number',
      type: 'text',
      required: true
    },
    {
      name: 'TrailerNumber',
      label: 'Trailer Number',
      type: 'text',
      required: false
    },
    {
      name: 'Status',
      label: 'Status',
      type: 'select',
      options: STATUS_OPTIONS,
      defaultValue: 'Active',
      required: true
    }
  ],

  item: [
    {
      name: 'ItemCode',
      label: 'Item Code',
      type: 'text',
      required: true
    },
    {
      name: 'ItemName',
      label: 'Item Name',
      type: 'text',
      required: true
    },
    {
      name: 'StandardWeight',
      label: 'Standard Weight (lbs)',
      type: 'number',
      required: false
    },
    {
      name: 'Status',
      label: 'Status',
      type: 'select',
      options: STATUS_OPTIONS,
      defaultValue: 'Active',
      required: true
    }
  ],

  size: [
    {
      name: 'SizeName',
      label: 'Size Name',
      type: 'text',
      required: true
    },
    {
      name: 'Status',
      label: 'Status',
      type: 'select',
      options: STATUS_OPTIONS,
      defaultValue: 'Active',
      required: true
    }
  ],

  product: [
    {
      name: 'ItemId',
      label: 'Item',
      type: 'select',
      collection: 'items',
      displayField: 'ItemCode',
      required: true
    },
    {
      name: 'SizeId',
      label: 'Size',
      type: 'select',
      collection: 'sizes',
      displayField: 'SizeName',
      required: true
    },
    {
      name: 'SupplierId',
      label: 'Supplier',
      type: 'select',
      collection: 'suppliers',
      displayField: 'SupplierName',
      required: true
    },
    {
      name: 'CustomerId',
      label: 'Customer',
      type: 'select',
      collection: 'customers',
      displayField: 'CustomerName',
      required: true
    },
    {
      name: 'StandardWeight',
      label: 'Standard Weight (lbs)',
      type: 'number',
      required: false
    },
    {
      name: 'Status',
      label: 'Status',
      type: 'select',
      options: STATUS_OPTIONS,
      defaultValue: 'Active',
      required: true
    }
  ],

  barge: [
    {
      name: 'BargeName',
      label: 'Barge Name',
      type: 'text',
      required: true
    },
    {
      name: 'SupplierId',
      label: 'Supplier',
      type: 'select',
      collection: 'suppliers',
      displayField: 'SupplierName',
      required: true
    },
    {
      name: 'SupplierName',
      label: 'Supplier Name',
      type: 'text',
      required: false
    },
    {
      name: 'ArrivalDate',
      label: 'Arrival Date',
      type: 'date',
      required: false
    },
    {
      name: 'Status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'Expected', label: 'Expected' },
        { value: 'Working', label: 'Working' },
        { value: 'Completed', label: 'Completed' }
      ],
      defaultValue: 'Expected',
      required: true
    }
  ],

  lot: [
    {
      name: 'LotNumber',
      label: 'Lot Number',
      type: 'text',
      required: true
    },
    {
      name: 'BargeId',
      label: 'Barge',
      type: 'select',
      collection: 'barges',
      displayField: 'BargeName',
      required: true
    },
    {
      name: 'CustomerId',
      label: 'Customer',
      type: 'select',
      collection: 'customers',
      displayField: 'CustomerName',
      required: true
    },
    {
      name: 'Status',
      label: 'Status',
      type: 'select',
      options: STATUS_OPTIONS,
      defaultValue: 'Active',
      required: true
    }
  ],

  barcode: [
    {
      name: 'Barcode',
      label: 'Barcode',
      type: 'text',
      required: true
    },
    {
      name: 'ItemId',
      label: 'Item',
      type: 'select',
      collection: 'items',
      displayField: 'ItemCode',
      required: true
    },
    {
      name: 'SizeId',
      label: 'Size',
      type: 'select',
      collection: 'sizes',
      displayField: 'SizeName',
      required: true
    },
    {
      name: 'LotId',
      label: 'Lot',
      type: 'select',
      collection: 'lots',
      displayField: 'LotNumber',
      required: true
    },
    {
      name: 'CustomerId',
      label: 'Customer',
      type: 'select',
      collection: 'customers',
      displayField: 'CustomerName',
      required: true
    },
    {
      name: 'BargeId',
      label: 'Barge',
      type: 'select',
      collection: 'barges',
      displayField: 'BargeName',
      required: true
    },
    {
      name: 'Quantity',
      label: 'Quantity (bags)',
      type: 'number',
      required: true
    },
    {
      name: 'StandardWeight',
      label: 'Weight per bag (lbs)',
      type: 'number',
      required: true
    },
    {
      name: 'Status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'Available', label: 'Available' },
        { value: 'Scanned', label: 'Scanned' },
        { value: 'Shipped', label: 'Shipped' },
        { value: 'Voided', label: 'Voided' }
      ],
      defaultValue: 'Available',
      required: true
    }
  ]
};

// Table column definitions for managers
export const TABLE_COLUMNS = {
  staff: ['Name', 'Role', 'Email', 'Auth Type', 'Status', 'Actions'],
  customers: ['Customer Name', 'Contact Name', 'Phone', 'City', 'State', 'Status', 'Actions'],
  suppliers: ['Supplier Name', 'BOL Prefix', 'Contact Name', 'Phone', 'Status', 'Actions'],
  carriers: ['Carrier Name', 'Contact Name', 'Phone', 'Status', 'Actions'],
  trucks: ['Truck Number', 'Trailer Number', 'Carrier', 'Status', 'Actions'],
  items: ['Item Code', 'Item Name', 'Standard Weight', 'Status', 'Actions'],
  sizes: ['Size Name', 'Status', 'Actions'],
  products: ['Item', 'Size', 'Supplier', 'Customer', 'Weight', 'Status', 'Actions'],
  barges: ['Barge Name', 'Supplier', 'Status', 'Actions'],
  lots: ['Lot Number', 'Barge', 'Customer', 'Status', 'Actions'],
  barcodes: ['Barcode', 'Item', 'Size', 'Lot', 'Customer', 'Quantity', 'Status', 'Actions']
};

// Navigation menu items
export const NAVIGATION_ITEMS = [
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
  'Data Import',
  'BOL Generator',
  'BOL Manager'
];

// Default form values
export const DEFAULT_VALUES = {
  Status: 'Active',
  AuthType: 'Google',
  StandardWeight: 2200
};