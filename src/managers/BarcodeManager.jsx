import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import PageHeader from '../components/PageHeader';
import Modal from '../modals/BarcodeModal';
import { EditIcon, DeleteIcon } from '../components/Icons';

export default function BarcodeManager() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [refs, setRefs] = useState({ barges:[], lots:[], customers:[], items:[], sizes:[] });

  useEffect(() => {
    ['barges','lots','customers','items','sizes','products'].forEach(col => {
      onSnapshot(collection(db,col),snap=>{
        setRefs(r=>({...r,[col]:snap.docs.map(d=>({ id:d.id, ...d.data() }))}));
      });
    });
  }, []);

  const { barges, lots, customers, items, sizes } = refs;
  if (![barges, lots, customers, items, sizes].every(a=>a.length)) {
    return <div className="flex justify-center p-8">Loading barcodes...</div>;
  }

  useEffect(() => {
    return onSnapshot(collection(db,'barcodes'),snap=>{
      setRows(snap.docs.map(d=>{
        const b=barges.find(x=>x.id===d.data().BargeId);
        const l=lots.find(x=>x.id===d.data().LotId);
        const c=customers.find(x=>x.id===d.data().CustomerId);
        const i=items.find(x=>x.id===d.data().ItemId);
        const s=sizes.find(x=>x.id===d.data().SizeId);
        return {
          id:d.id,
          ...d.data(),
          BargeName: b?.BargeName||'—',
          LotNumber: l?.LotNumber||'—',
          CustomerName:c?.CustomerName||'—',
          ItemCode: i?.ItemCode||'—',
          SizeName: s?.SizeName||'—',
          GeneratedBarcode: `${b?.BargeName||''}${l?.LotNumber||''}${c?.CustomerName||''}${i?.ItemCode||''}${s?.SizeName||''}`.replace(/\\s/g,'')
        };
      }));
    });
  }, [refs]);

  const fields=[ 
    {name:'BargeName',label:'Barge'},
    {name:'LotNumber',label:'Lot #'},
    {name:'CustomerName',label:'Customer'},
    {name:'ItemCode',label:'Item'},
    {name:'SizeName',label:'Size'},
    {name:'GeneratedBarcode',label:'Barcode'},
    {name:'Quantity',label:'Qty',type:'number'},
  ];

  return (
    <>
      <PageHeader title="Barcodes Management" subtitle="Manage barcodes" buttonText="Add New Barcode" onAdd={()=>{setCurrent(null);setOpen(true);}}/>
      <div className="bg-white shadow rounded overflow-x-auto">
        {/* table same pattern as above */}
      </div>
      {open && <Modal
        title={`${current?'Edit':'Add'} Barcode`}
        initialData={current}
        referenceData={refs}
        onClose={()=>setOpen(false)}
        onSave={async data=>{
          if(current?.id) await updateDoc(doc(db,'barcodes',current.id),data);
          else await addDoc(collection(db,'barcodes'),data);
          setOpen(false);
        }}
      />}
    </>
  );
}
