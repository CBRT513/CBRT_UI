import { useAuth } from "./SSOAuthContext";
const ORDER = { viewer:0, loader:1, supervisor:2, admin:3 };

export function Guard({ need, children }) {
  const flagOn = String(import.meta.env.VITE_ENABLE_SSO) === "true";
  if (!flagOn) return children; // legacy path allowed when flag off
  const { ready, user, role } = useAuth();
  if (!ready) return null;
  if (!user) return <div className="p-6">Please sign in.</div>;
  if (!role)  return children; // temporary until /me; server enforces anyway
  if (ORDER[role] >= ORDER[need]) return children;
  return <div className="p-6 text-red-600">Forbidden: requires {need}</div>;
}
export const ViewerGuard = (p)=> <Guard need="viewer" {...p}/>;
export const LoaderGuard = (p)=> <Guard need="loader" {...p}/>;
export const SupervisorGuard = (p)=> <Guard need="supervisor" {...p}/>;
export const AdminGuard = (p)=> <Guard need="admin" {...p}/>