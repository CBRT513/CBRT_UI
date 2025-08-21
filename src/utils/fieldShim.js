// fieldShim.js - Centralized dual-read logic for PascalCase → camelCase migration
// This utility provides backwards compatibility during the schema transition

/**
 * Get field value with camelCase preference, fallback to PascalCase
 * @param {Object} data - The data object to read from
 * @param {string} fieldName - The camelCase field name
 * @returns {any} Field value (camelCase preferred, PascalCase fallback)
 */
export const getField = (data, fieldName) => {
  if (!data || typeof data !== 'object') return undefined;
  
  // Return camelCase version if it exists
  if (data.hasOwnProperty(fieldName)) {
    return data[fieldName];
  }
  
  // Fallback to PascalCase version
  const pascalFieldName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
  return data[pascalFieldName];
};

/**
 * Standard field mappings for common entities
 */
export const FIELD_MAPPINGS = {
  // Release fields
  releaseNumber: 'ReleaseNumber',
  
  // Customer fields  
  customerName: 'CustomerName',
  contactName: 'ContactName',
  
  // Supplier fields
  supplierName: 'SupplierName',
  bolPrefix: 'BOLPrefix',
  
  // Item fields
  itemCode: 'ItemCode',
  itemName: 'ItemName',
  
  // Size fields
  sizeName: 'SizeName',
  sortOrder: 'SortOrder',
  
  // Lot fields
  lotNumber: 'LotNumber',
  
  // Barge fields
  bargeName: 'BargeName',
  
  // Carrier fields
  carrierName: 'CarrierName',
  dotNumber: 'DOTNumber',
  mcNumber: 'MCNumber',
  
  // Common fields
  status: 'Status',
  createdAt: 'CreatedAt',
  updatedAt: 'UpdatedAt',
  phone: 'Phone',
  email: 'Email',
  address: 'Address',
  city: 'City',
  state: 'State'
};

/**
 * Batch field reader for multiple fields
 * @param {Object} data - Source data object
 * @param {Array} fieldNames - Array of camelCase field names
 * @returns {Object} Object with camelCase keys and extracted values
 */
export const getFields = (data, fieldNames) => {
  const result = {};
  fieldNames.forEach(fieldName => {
    result[fieldName] = getField(data, fieldName);
  });
  return result;
};

/**
 * Entity-specific field extractors
 */
export const extractCustomer = (customer) => getFields(customer, [
  'customerName', 'contactName', 'phone', 'email', 'address', 'city', 'state', 'status'
]);

export const extractSupplier = (supplier) => getFields(supplier, [
  'supplierName', 'bolPrefix', 'contactName', 'phone', 'status'
]);

export const extractItem = (item) => getFields(item, [
  'itemCode', 'itemName', 'status'
]);

export const extractSize = (size) => getFields(size, [
  'sizeName', 'sortOrder', 'status'
]);

export const extractLot = (lot) => getFields(lot, [
  'lotNumber', 'itemCode', 'status'
]);

export const extractRelease = (release) => getFields(release, [
  'releaseNumber', 'customerName', 'supplierName', 'status', 'createdAt'
]);

/**
 * Write field with camelCase naming
 * @param {string} fieldName - camelCase field name
 * @param {any} value - Field value
 * @returns {Object} Object with camelCase field
 */
export const setField = (fieldName, value) => {
  return { [fieldName]: value };
};

/**
 * Convert entire object from PascalCase to camelCase
 * @param {Object} data - Source object with PascalCase fields
 * @returns {Object} New object with camelCase fields
 */
export const toCamelCase = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const result = {};
  Object.keys(data).forEach(key => {
    const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
    result[camelKey] = data[key];
  });
  return result;
};

/**
 * Normalize data object to use camelCase fields
 * Preserves both versions during transition period
 */
export const normalizeFields = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const normalized = { ...data };
  
  // Add camelCase versions of known PascalCase fields
  Object.entries(FIELD_MAPPINGS).forEach(([camelCase, pascalCase]) => {
    if (data[pascalCase] !== undefined && data[camelCase] === undefined) {
      normalized[camelCase] = data[pascalCase];
    }
  });
  
  return normalized;
};

export default {
  getField,
  getFields,
  setField,
  toCamelCase,
  normalizeFields,
  extractCustomer,
  extractSupplier,
  extractItem,
  extractSize,
  extractLot,
  extractRelease,
  FIELD_MAPPINGS
};