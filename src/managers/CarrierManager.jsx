import React from 'react';
import Manager from '../components/Manager';

export default function CarrierManager() {
  return (
    <Manager
      collectionName="carriers"
      fields={[
        { name:'CarrierName', label:'Carrier Name', type:'text' },
        { name:'Status', label:'Status', type:'select', options:['Active','Inactive'] },
      ]}
    />
  );
}
