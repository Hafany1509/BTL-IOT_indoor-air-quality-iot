import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
export function ForbiddenPage() {
  return <div className="standalone empty"><ShieldAlert size={36} /><h1>Không đủ quyền truy cập</h1>
    <Link className="button primary" to="/dashboard">Về tổng quan</Link></div>;
}
