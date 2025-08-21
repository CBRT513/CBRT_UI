import { useEffect, useState } from "react";
export default function HealthCheck() {
  const [data, setData] = useState(null), [err, setErr] = useState(null);
  useEffect(() => { fetch(`${import.meta.env.VITE_API_BASE}/api/health`).then(r=>r.json()).then(setData).catch(e=>setErr(String(e))); }, []);
  return <pre className="p-4 text-sm">{err ? err : JSON.stringify(data, null, 2)}</pre>;
}