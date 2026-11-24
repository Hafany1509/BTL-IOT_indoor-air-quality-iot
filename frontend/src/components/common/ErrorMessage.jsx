import { AlertCircle } from 'lucide-react';
import { errorText } from '../../api/axiosClient';
import { Button } from './Button';
export function ErrorMessage({ error, retry }) {
  if (!error) return null;
  return <div className="error-message" role="alert"><AlertCircle size={17} />
    <span>{typeof error === 'string' ? error : errorText(error)}</span>
    {retry && <Button variant="secondary" onClick={retry}>Thử lại</Button>}
  </div>;
}
