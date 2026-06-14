import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ArrowUpDown, Target, Wand2, MessageSquare, LogOut, Briefcase, Receipt, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowUpDown },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/simulator', label: 'Simulator', icon: Wand2 },
  { to: '/chat', label: 'AI Chat', icon: MessageSquare },
  { to: '/tax', label: 'Tax', icon: Receipt },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebar = (
    <>
      <div className="p-4 sm:p-5 lg:p-6 border-b border-zinc-800">
        <NavLink to="/dashboard" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Briefcase size={18} className="text-primary" />
          </div>
          <span className="text-base sm:text-lg font-bold text-white tracking-tight">AUTO CFO</span>
        </NavLink>
      </div>
      <nav className="flex-1 p-3 sm:p-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`
            }
          >
            <Icon size={18} className="flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-3 sm:p-4 border-t border-zinc-800">
        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 px-2 sm:px-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs sm:text-sm font-medium text-primary">
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
            <p className="text-[10px] sm:text-xs text-zinc-500 truncate">{user?.email || ''}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-danger hover:bg-zinc-800/50 transition-all duration-200"
        >
          <LogOut size={18} className="flex-shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex">
      {/* Mobile: hamburger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-white"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile: overlay backdrop */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile: off-canvas sidebar */}
      <aside className={`lg:hidden fixed top-0 left-0 h-full w-64 sm:w-72 bg-black/95 border-r border-zinc-800 flex flex-col z-50 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebar}
      </aside>

      {/* Desktop: fixed sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-56 xl:w-64 bg-black/40 border-r border-zinc-800 flex-col z-50">
        {sidebar}
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen lg:ml-56 xl:ml-64 p-3 sm:p-5 md:p-6 lg:p-8 pt-14 lg:pt-8">
        <Outlet />
      </main>
    </div>
  );
}
