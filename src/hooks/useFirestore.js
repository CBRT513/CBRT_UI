import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export function useFirestoreCollection(collectionName, constraints = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  const retry = useCallback(() => {
    setError(null);
    setRetryKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, collectionName), ...constraints);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setData(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [collectionName, retryKey, ...constraints]);

  return { data, loading, error, retry };
}

export function useFirestoreMultiCollection(collections) {
  const [data, setData] = useState({});
  const [loadingCount, setLoadingCount] = useState(0);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  const retry = useCallback(() => {
    setError(null);
    setRetryKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    setLoadingCount(collections.length);
    const unsubscribes = [];

    collections.forEach(({ name, constraints = [] }) => {
      const q = query(collection(db, name), ...constraints);
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          setData(prev => ({ ...prev, [name]: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) }));
          setLoadingCount(prev => prev - 1);
        },
        (err) => {
          setError(err);
          setLoadingCount(prev => prev - 1);
        }
      );
      unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [retryKey, JSON.stringify(collections)]);

  return { data, loading: loadingCount > 0, error, retry };
}

export function useFirestoreActions(collectionName) {
  const [actionLoading, setActionLoading] = useState(false);

  const add = useCallback(async (data) => {
    setActionLoading(true);
    try {
      await addDoc(collection(db, collectionName), data);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }, [collectionName]);

  const update = useCallback(async (id, newData) => {
    setActionLoading(true);
    try {
      const ref = doc(db, collectionName, id);
      await updateDoc(ref, newData);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }, [collectionName]);

  const del = useCallback(async (id) => {
    setActionLoading(true);
    try {
      const ref = doc(db, collectionName, id);
      await deleteDoc(ref);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }, [collectionName]);

  return { add, update, delete: del, actionLoading };
}
