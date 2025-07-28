import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import PageHeader from '../components/PageHeader';
import StaffModal from '../modals/StaffModal';
import { EditIcon, DeleteIcon } from '../components/Icons';

export default function StaffManager() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  useEffect(() =>
    onSnapshot(collection(db, 'staff'), snap =>
      setRows(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    ), []
  );

  return (
    <>
      <PageHeader title="Staff Management" subtitle="Manage staff" buttonText="Add New Staff" onAdd={()=>{setCurrent(null);setOpen(true);}}/>
      <div className="bg-white shadow rounded overflow-x-auto">
        {/* table same pattern */}
      </div>
      {open && <StaffModal title={`${current?'Edit':'Add'} Staff`} initialData={current} onClose={()=>setOpen(false)} onSave={async data=>{
        if(current?.id) await updateDoc(doc(db,'staff',current.id),data);
        else await addDoc(collection(db,'staff'),data);
        setOpen(false);
      }}/>}
    </>
  );
}
