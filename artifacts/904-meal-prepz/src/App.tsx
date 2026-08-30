import { useLocation } from 'wouter';
import AdminApp from '@/AdminApp';
import PublicSite from '@/PublicSite';

export default function App() {
  const [location] = useLocation();
  return location.startsWith('/admin') ? <AdminApp /> : <PublicSite />;
}