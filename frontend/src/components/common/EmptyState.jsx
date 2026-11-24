import { Inbox } from 'lucide-react';
import { Button } from './Button';
export function EmptyState({ children = 'Chưa có dữ liệu.', retry }) {
  return <div className="empty"><Inbox size={30} /><p>{children}</p>
    {retry && <Button variant="secondary" onClick={retry}>Thử lại</Button>}
  </div>;
}
