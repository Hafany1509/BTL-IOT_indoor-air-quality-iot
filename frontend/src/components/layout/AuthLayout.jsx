import { Leaf } from 'lucide-react';
import illustration from '../../assets/login-illustration.webp';
export function AuthLayout({ children }) {
  return <main className="auth-layout">
    <aside className="auth-art">
      <div className="brand"><span className="brand-icon"><Leaf size={24} /></span>Air Quality IoT</div>
      <div className="auth-promo"><h2>Không khí trong nhà,<br />theo dõi mỗi ngày.</h2><p>Giám sát nhiệt độ, độ ẩm và chất lượng không khí từ node ESP32.</p></div>
      <img className="auth-illustration" src={illustration} alt="" />
    </aside>
    <section className="auth-content">{children}</section>
  </main>;
}
