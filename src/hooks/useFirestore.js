import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Subscribe to a Firestore collection with optional query constraints.
 * @param {string} collectionName
 * @param {import('firebase/firestore').QueryConstraint[]} [constraints=[]]
 * @returns {{data: any[], loading: boolean, error: Error|null, retry: () => void}}
 */
export function useFirestoreCollection(collectionName, constraints = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refresh, setRefresh] = useState(0);

  const subscribe = useCallback(() => {
    setLoading(true);
    setError(null);
    const q = query(collection(db, collectionName), ...constraints);
    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError(err);
        setLoading(false);
      }
    );
    return unsub;
  }, [collectionName, constraints]);

  useEffect(() => {
    const unsub = subscribe();
    return () => unsub();
  }, [subscribe, refresh]);

  const retry = useCallback(() => setRefresh((r) => r + 1), []);

  return { data, loading, error, retry };
}

/**
 * Subscribe to multiple Firestore collections.
 * @param {{name:string, constraints?:import('firebase/firestore').QueryConstraint[]}[]} cols
 * @returns {{data: Object<string, any[]>, loading: boolean, error: Error|null, retry: () => void}}
 */
export function useFirestoreMultiCollection(cols) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refresh, setRefresh] = useState(0);

  const subscribe = useCallback(() => {
    setLoading(true);
    setError(null);
    const unsubscribes = [];
    let loaded = 0;

    cols.forEach(({ name, constraints = [] }) => {
      const q = query(collection(db, name), ...constraints);
      const unsub = onSnapshot(
        q,
        (snap) => {
          setData((d) => ({
            ...d,
            [name]: snap.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            })),
          }));
          loaded += 1;
          if (loaded === cols.length) setLoading(false);
        },
        (err) => {
          console.error(err);
          setError(err);
          setLoading(false);
        }
      );
      unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach((fn) => fn());
  }, [cols]);

  useEffect(() => {
    const cleanup = subscribe();
    return cleanup;
  }, [subscribe, refresh]);

  const retry = useCallback(() => setRefresh((r) => r + 1), []);

  return { data, loading, error, retry };
}

/**
 * CRUD helpers for a Firestore collection.
 * @param {string} collectionName
 * @returns {{add: Function, update: Function, delete: Function, actionLoading: boolean}}
 */
export function useFirestoreActions(collectionName) {
  const [actionLoading, setActionLoading] = useState(false);

  const add = useCallback(
    async (payload) => {
      setActionLoading(true);
      try {
        await addDoc(collection(db, collectionName), payload);
      } finally {
        setActionLoading(false);
      }
    },
    [collectionName]
  );

  const update = useCallback(
    async (id, payload) => {
      setActionLoading(true);
      try {
        await updateDoc(doc(db, collectionName, id), payload);
      } finally {
        setActionLoading(false);
      }
    },
    [collectionName]
  );

  const remove = useCallback(
    async (id) => {
      setActionLoading(true);
      try {
        await deleteDoc(doc(db, collectionName, id));
      } finally {
        setActionLoading(false);
      }
    },
    [collectionName]
  );

  return { add, update, delete: remove, actionLoading };
}
