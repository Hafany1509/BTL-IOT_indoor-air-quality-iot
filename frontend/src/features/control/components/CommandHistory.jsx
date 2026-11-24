import { Button } from '../../../components/common/Button';
import { EmptyState } from '../../../components/common/EmptyState';
import { Modal } from '../../../components/common/Modal';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { formatDate } from '../../../utils/formatDate';
import { useState } from 'react';
import { commandNames, commandValue } from './CommandStatus';

export function CommandHistory({ rows }) {
  const [detail, setDetail] = useState(null);
  if (!rows.length) return <EmptyState>Chưa có lệnh điều khiển.</EmptyState>;
  return <>
    <div className="table-wrap"><table aria-label="Lịch sử điều khiển">
      <thead><tr><th>Thời gian</th><th>Mã lệnh</th><th>Thiết bị</th><th>Hành động</th><th>Người gửi</th><th>Trạng thái</th><th>Thời gian ACK</th><th>Lỗi</th><th>Chi tiết</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.command_id}>
        <td>{formatDate(row.created_at)}</td><td>{row.command_id}</td><td>{commandNames[row.command_type] || row.command_type}</td>
        <td>{commandValue(row.payload?.value)}</td><td>#{row.requested_by}</td><td><StatusBadge status={row.status} /></td>
        <td>{formatDate(row.ack_at)}</td><td className="wrap-cell">{row.error_message || '—'}</td>
        <td><Button variant="secondary" onClick={() => setDetail(row)}>Xem</Button></td>
      </tr>)}</tbody>
    </table></div>
    {detail && <Modal title={detail.command_id} onClose={() => setDetail(null)}>
      <h3>Dữ liệu lệnh</h3><pre className="code">{JSON.stringify(detail.payload, null, 2)}</pre>
      <h3>Phản hồi node</h3><pre className="code">{detail.result_payload ? JSON.stringify(detail.result_payload, null, 2) : 'Chưa có phản hồi.'}</pre>
    </Modal>}
  </>;
}
