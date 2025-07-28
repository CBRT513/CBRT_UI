import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { EditIcon, DeleteIcon } from '../components/Icons';

export default function LotManager() {
  const [rows, setRows] = useState([]);
  const [barges, setBarges] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    const unb = onSnapshot(collection(db,'barges'),snap=>setBarges(snap.docs.map(d=>({id:d.id,name:d.data().BargeName}))));
    const unc = onSnapshot(collection(db,'customers'),snap=>setCustomers(snap.docs.map(d=>({id:d.id,name:d.data().CustomerName}))));
    return ()=>{unb();unc();};
  }, []);

  useEffect(() => {
    if (!barges.length || !customers.length) return;
    return onSnapshot(collection(db, 'lots'), snap => {
      setRows(snap.docs.map(d => {
        const data = {id:d.id,...d.data()};
        return {
          ...data,
          BargeName: barges.find(b=>b.id===data.BargeId)?.name || 'Unknown',
          CustomerName: customers.find(c=>c.id===data.CustomerId)?.name || 'Unknown'
        };
      }));
    });
  }, [barges, customers]);

  const fields = [
    { name:'LotNumber', label:'Lot Number', type:'text' },
    { name:'BargeName', label:'Barge', type:'display' },
    { name:'CustomerName', label:'Customer', type:'display' },
    { name:'Status', label:'Status', type:'select', options:['Active','Inactive'] },
  ];

  if (!barges.length || !customers.length) {
    return <div className="flex justify-center p-8">Loading lots...</div>;
  }

  return (
    <>
      <PageHeader title="Lots Management" subtitle="Manage lots" buttonText="Add New Lot" onAdd={()=>{setCurrent(null);setOpen(true);}}/>
      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600"><tr>
            {fields.map(f=><th key={f.name} className="px-6 py-3 text-left">{f.label}</th>)}
            <th className="px-6 py-3 text-right">Actions</th>
          </tr></thead>
          <tbody>
            {rows.map(r=><tr key={r.id} className="hover:bg-gray-50">
              {fields.map(f=><td key={f.name} className="px-6 py-4">{r[f.name] ?? '—'}</td>)}
              <td className="px-6 py-4 text-right">
                <button onClick={()=>{setCurrent(r);setOpen(true);}} className="text-green-800 hover:text-green-600" title="Edit"><EditIcon/></button>
                <button onClick={async()=>{if(confirm('Delete this lot?'))await deleteDoc(doc(db,'lots',r.id));}} className="text-red-600 hover:text-red-800" title="Delete"><DeleteIcon/></button>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {open && <Modal
        title={`${current?'Edit':'Add'} Lot`}
        fields={[
          {name:'LotNumber',label:'Lot Number',type:'text'},
          {name:'BargeId',label:'Barge',type:'select',options:barges},
          {name:'CustomerId',label:'Customer',type:'select',options:customers},
          {name:'Status',label:'Status',type:'select',options:['Active','Inactive']},
          {name:'Notes',label:'Notes',type:'text'},
        ]}
        initialData={current}
        onClose={()=>setOpen(false)}
        onSave={async data=>{if(current?.id)await updateDoc(doc(db,'lots',current.id),data);else await addDoc(collection(db,'lots'),data);setOpen(false);}}
      />}
    </>
  );
}
