import React from 'react';
import Manager from '../components/Manager';

export default function CustomerManager() {
  return (
    <Manager
      collectionName="customers"
      fields={[
        { name:'CustomerName', label:'Customer Name', type:'text' },
        { name:'ShippingAddress', label:'Shipping Address', type:'text' },
        { name:'ShippingCity', label:'Shipping City', type:'text' },
        { name:'ShippingState', label:'Shipping State', type:'text' },
        { name:'ShippingZip', label:'Shipping Zip', type:'text' },
        { name:'Status', label:'Status', type:'select', options:['Active','Inactive'] },
      ]}
    />
  );
}
