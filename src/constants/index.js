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
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true
    },
    {
      name: 'role',
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
      name: 'email',
      label: 'Email',
      type: 'email',
      required: false
    },
    {
      name: 'phone',
      label: 'Phone Number',
      type: 'tel',
      required: false
    },
    {
      name: 'receivesNewRelease',
      label: 'Receives New Release Notifications',
      type: 'checkbox',
      required: false,
      defaultValue: false
    },
    {
      name: 'authType',
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
      name: 'customerName',
      label: 'Customer Name',
      type: 'text',
      required: true
    },
    {
      name: 'contactName',
      label: 'Contact Name',
      type: 'text',
      required: false
    },
    {
      name: 'phone',
      label: 'Phone',
      type: 'tel',
      required: false
    },
    {
      name: 'address',
      label: 'Address',
      type: 'text',
      required: false
    },
    {
      name: 'city',
      label: 'City',
      type: 'text',
      required: false
    },
    {
      name: 'state',
      label: 'State',
      type: 'text',
      required: false
    },
    {
      name: 'zipCode',
      label: 'Zip Code',
      type: 'text',
      required: false
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

  supplier: [
    {
      name: 'supplierName',
      label: 'Supplier Name',
      type: 'text',
      required: true
    },
    {
      name: 'bolPrefix',
      label: 'BOL Prefix',
      type: 'text',
      required: true
    },
    {
      name: 'contactName',
      label: 'Contact Name',
      type: 'text',
      required: false
    },
    {
      name: 'phone',
      label: 'Phone',
      type: 'tel',
      required: false
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: false
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

  carrier: [
    {
      name: 'carrierName',
      label: 'Carrier Name',
      type: 'text',
      required: true
    },
    {
      name: 'contactName',
      label: 'Contact Name',
      type: 'text',
      required: false
    },
    {
      name: 'phone',
      label: 'Phone',
      type: 'tel',
      required: false
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: false
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

  truck: [
    {
      name: 'carrierId',
      label: 'Carrier',
      type: 'select',
      required: true,
      collection: 'carriers',
      displayField: 'carrierName'
    },
    {
      name: 'truckNumber',
      label: 'Truck Number',
      type: 'text',
      required: true
    },
    {
      name: 'trailerNumber',
      label: 'Trailer Number',
      type: 'text',
      required: false
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

  item: [
    {
      name: 'itemCode',
      label: 'Item Code',
      type: 'text',
      required: true
    },
    {
      name: 'itemName',
      label: 'Item Name',
      type: 'text',
      required: true
    },
    {
      name: 'standardWeight',
      label: 'Standard Weight (lbs)',
      type: 'number',
      required: false
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

  size: [
    {
      name: 'sizeName',
      label: 'Size Name',
      type: 'text',
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

  product: [
    {
      name: 'itemId',
      label: 'Item',
      type: 'select',
      collection: 'items',
      displayField: 'itemCode',
      required: true
    },
    {
      name: 'sizeId',
      label: 'Size',
      type: 'select',
      collection: 'sizes',
      displayField: 'sizeName',
      required: true
    },
    {
      name: 'supplierId',
      label: 'Supplier',
      type: 'select',
      collection: 'suppliers',
      displayField: 'supplierName',
      required: true
    },
    {
      name: 'customerId',
      label: 'Customer',
      type: 'select',
      collection: 'customers',
      displayField: 'customerName',
      required: true
    },
    {
      name: 'standardWeight',
      label: 'Standard Weight (lbs)',
      type: 'number',
      required: false
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

  barge: [
    {
      name: 'bargeName',
      label: 'Barge Name',
      type: 'text',
      required: true
    },
    {
      name: 'supplierId',
      label: 'Supplier',
      type: 'select',
      collection: 'suppliers',
      displayField: 'supplierName',
      required: true
    },
    {
      name: 'supplierName',
      label: 'Supplier Name',
      type: 'text',
      required: false
    },
    {
      name: 'arrivalDate',
      label: 'Arrival Date',
      type: 'date',
      required: false
    },
    {
      name: 'status',
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
      name: 'lotNumber',
      label: 'Lot Number',
      type: 'text',
      required: true
    },
    {
      name: 'bargeId',
      label: 'Barge',
      type: 'select',
      collection: 'barges',
      displayField: 'bargeName',
      required: true
    },
    {
      name: 'customerId',
      label: 'Customer',
      type: 'select',
      collection: 'customers',
      displayField: 'customerName',
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

  barcode: [
    {
      name: 'barcode',
      label: 'Barcode',
      type: 'text',
      required: true
    },
    {
      name: 'itemId',
      label: 'Item',
      type: 'select',
      collection: 'items',
      displayField: 'itemCode',
      required: true
    },
    {
      name: 'sizeId',
      label: 'Size',
      type: 'select',
      collection: 'sizes',
      displayField: 'sizeName',
      required: true
    },
    {
      name: 'lotId',
      label: 'Lot',
      type: 'select',
      collection: 'lots',
      displayField: 'lotNumber',
      required: true
    },
    {
      name: 'customerId',
      label: 'Customer',
      type: 'select',
      collection: 'customers',
      displayField: 'customerName',
      required: true
    },
    {
      name: 'bargeId',
      label: 'Barge',
      type: 'select',
      collection: 'barges',
      displayField: 'bargeName',
      required: true
    },
    {
      name: 'quantity',
      label: 'Quantity (bags)',
      type: 'number',
      required: true
    },
    {
      name: 'standardWeight',
      label: 'Weight per bag (lbs)',
      type: 'number',
      required: true
    },
    {
      name: 'status',
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
  status: 'Active',
  authType: 'Google',
  standardWeight: 2200
};