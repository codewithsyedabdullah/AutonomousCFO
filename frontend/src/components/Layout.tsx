import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ArrowUpDown, Target, Wand2, MessageSquare, LogOut, Briefcase, Receipt } from 'lucide-react';
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex">
      <aside className="fixed left-0 top-0 h-full w-64 bg-black/40 border-r border-zinc-800 flex flex-col z-50">
        <div className="p-6 border-b border-zinc-800">
          <NavLink to="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
              <Briefcase size={20} className="text-primary" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">AUTO CFO</span>
          </NavLink>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-zinc-500 truncate">{user?.email || ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-danger hover:bg-zinc-800/50 transition-all duration-200"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="ml-64 flex-1 min-h-screen p-8">
        <Outlet />
      </main>
    </div>
  );
}
