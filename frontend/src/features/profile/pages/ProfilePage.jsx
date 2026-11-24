import { useState } from 'react';
import { LogOut, UserRound } from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { Card } from '../../../components/common/Card';
import { PageHeader } from '../../../components/common/PageHeader';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { useAuth } from '../../../hooks/useAuth';
import { formatDate } from '../../../utils/formatDate';
import { ChangePasswordForm } from '../components/ChangePasswordForm';
import { ProfileForm } from '../components/ProfileForm';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('profile');
  const [signingOut, setSigningOut] = useState(false);
  return <>
    <PageHeader title="Hồ sơ cá nhân" description="Cập nhật thông tin và mật khẩu tài khoản." />
    <div className="grid dashboard">
      <Card className="stack">
        <div><span className="avatar profile-photo"><UserRound size={31} /></span><h2>{user.full_name}</h2><p className="muted">@{user.username}</p></div>
        <div className="inline"><StatusBadge status={user.role} /><StatusBadge status={user.status} /></div>
        <small>Ngày tạo · {formatDate(user.created_at)}</small>
        <div><Button variant="secondary" disabled={signingOut} onClick={() => { setSigningOut(true); logout(); }}>
          <LogOut size={16} /> {signingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
        </Button></div>
      </Card>
      <Card className="stack">
        <div className="tab-strip" aria-label="Mục hồ sơ">
          <Button variant="secondary" aria-pressed={tab === 'profile'} onClick={() => setTab('profile')}>Thông tin cá nhân</Button>
          <Button variant="secondary" aria-pressed={tab === 'password'} onClick={() => setTab('password')}>Đổi mật khẩu</Button>
        </div>
        {tab === 'profile' ? <ProfileForm /> : <ChangePasswordForm />}
      </Card>
    </div>
  </>;
}
