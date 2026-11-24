import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
export function NotificationMenu() {
  return <Link to="/alerts" className="icon-button notification" aria-label="Xem cảnh báo"><Bell size={20} /></Link>;
}
