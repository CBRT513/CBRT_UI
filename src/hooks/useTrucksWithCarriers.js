import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function useTrucksWithCarriers() {
  const [trucks, setTrucks] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let trucksUnsub = null;
    let carriersUnsub = null;
    let trucksData = [];
    let carriersData = [];

    const updateTrucks = () => {
      if (!carriersData.length) return;
      const enriched = trucksData.map(truck => ({
        ...truck,
        CarrierName: carriersData.find(c => c.id === truck.Carrier)?.name || 'Unknown Carrier',
      }));
      setTrucks(enriched);
      setIsLoading(false);
    };

    carriersUnsub = onSnapshot(collection(db, 'carriers'), snap => {
      carriersData = snap.docs.map(d => ({ id: d.id, name: d.data().CarrierName }));
      setCarriers(carriersData);
      updateTrucks();
    });

    trucksUnsub = onSnapshot(collection(db, 'trucks'), snap => {
      trucksData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      updateTrucks();
    });

    return () => {
      trucksUnsub?.();
      carriersUnsub?.();
    };
  }, []);

  return { trucks, carriers, isLoading };
}