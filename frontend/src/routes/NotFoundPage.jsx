import { Link } from 'react-router-dom';
export function NotFoundPage() {
  return <div className="standalone empty"><h1>Không tìm thấy trang</h1>
    <Link className="button primary" to="/dashboard">Về tổng quan</Link></div>;
}
