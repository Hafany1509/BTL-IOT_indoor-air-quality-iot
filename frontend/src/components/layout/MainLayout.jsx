import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { DeviceProvider } from '../../context/DeviceContext';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
export function MainLayout() {
  const [open, setOpen] = useState(false);
  const drawer = useRef(null);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const dialog = drawer.current;
    dialog.showModal();
    return () => dialog.close();
  }, [open]);
  const close = () => setOpen(false);
  return <DeviceProvider><div className="app-shell">
    <div className="desktop-sidebar"><Sidebar close={close} /></div>
    {open && <dialog ref={drawer} className="drawer" aria-label="Menu điều hướng" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}><Sidebar open close={close} /></dialog>}
    <div className="app-body"><Header openMenu={() => setOpen(true)} menuOpen={open} />
      <main className="page" id="main-content"><Outlet /></main></div>
  </div></DeviceProvider>;
}
