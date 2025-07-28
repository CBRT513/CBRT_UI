import React from 'react';
import Manager from '../components/Manager';

export default function SupplierManager() {
  return (
    <Manager
      collectionName="suppliers"
      fields={[
        { name:'SupplierName', label:'Supplier Name', type:'text' },
        { name:'BOLPrefix', label:'BOL Prefix', type:'text' },
        { name:'Status', label:'Status', type:'select', options:['Active','Inactive'] },
      ]}
    />
  );
}
