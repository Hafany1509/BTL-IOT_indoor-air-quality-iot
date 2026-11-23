import { useCallback, useState } from 'react';
import { Card } from '../../../components/common/Card';
import { Modal } from '../../../components/common/Modal';
import { PageHeader } from '../../../components/common/PageHeader';
import { Pagination } from '../../../components/common/Pagination';
import { QueryState } from '../../../components/common/QueryState';
import { usePolling } from '../../../hooks/usePolling';
import { auditService } from '../auditService';
import { AuditLogFilter } from '../components/AuditLogFilter';
import { AuditLogTable } from '../components/AuditLogTable';
export function AuditLogsPage() {
  const [filters, setFilters] = useState({ limit: 50 });
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const load = useCallback(signal => auditService.list({ ...filters, offset: (page - 1) * filters.limit }, signal), [filters, page]);
  const query = usePolling(load);
  return <>
    <PageHeader title="Nhật ký hệ thống" description="Tra cứu hoạt động và kết quả xử lý được ghi nhận." />
    <div className="stack">
      <Card><AuditLogFilter onApply={values => { setPage(1); setFilters(values); }} /></Card>
      <Card><QueryState query={query}>{rows => <>
        <AuditLogTable rows={rows} onOpen={setDetail} />
        {(page > 1 || rows.length === filters.limit) && <Pagination page={page} onPage={setPage} hasNext={rows.length === filters.limit} />}
      </>}</QueryState></Card>
    </div>
    {detail && <Modal title={'Metadata · Bản ghi #' + detail.id} onClose={() => setDetail(null)}>
      <pre className="code">{JSON.stringify(detail.metadata ?? null, null, 2)}</pre>
    </Modal>}
  </>;
}
