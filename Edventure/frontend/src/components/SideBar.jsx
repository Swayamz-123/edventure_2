import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Swords, 
  Trophy, 
  BarChart3, 
  FileText, 
  Home, 
  HelpCircle, 
  LogOut, 
  Menu, 
  X,
  Sparkles,
  Activity
} from 'lucide-react';

function Sidebar({ onLogout }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Your Squad', path: '/friends', icon: Users },
    { name: 'Battle Arena', path: '/battlegrounds/lobby', icon: Swords },
    { name: 'Rewards Shop', path: '/rewards', icon: Trophy },
    { name: 'Leaderboard', path: '/leaderboard', icon: BarChart3 },
    { name: 'PDF to Quiz', path: '/pdf-quiz', icon: FileText },
    { name: 'System Analytics', path: '/admin', icon: Activity },
  ];

  const secondaryItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Help & FAQ', path: '/help', icon: HelpCircle },
  ];

  const isActive = (path) => {
    if (path === '/battlegrounds/lobby') {
      return location.pathname.startsWith('/battlegrounds');
    }
    return location.pathname === path;
  };

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={toggleMobileMenu}
        aria-label="Toggle Navigation"
        className="fixed top-4 left-4 z-50 md:hidden bg-[#0F2933] border border-[#2A4A57] text-[#9AE9FD] p-2.5 rounded-xl shadow-2xl focus:outline-none"
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={closeMobileMenu}
        />
      )}

      {/* Modern Sleek Glassmorphism Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-[#081B24]/95 backdrop-blur-xl border-r border-[#1B3A48] flex flex-col justify-between p-5 z-50 transition-transform duration-300 ease-in-out shadow-2xl ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div>
          {/* Brand Header */}
          <Link 
            to="/dashboard" 
            onClick={closeMobileMenu}
            className="flex items-center gap-3 px-2 py-3 mb-6 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00D2FF] to-[#0072FF] flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <span className="font-extrabold text-white text-xl">E</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black text-white tracking-tight">Edventure</span>
                <Sparkles className="w-3.5 h-3.5 text-[#9AE9FD]" />
              </div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-cyan-400/80">
                Gamified Arena
              </p>
            </div>
          </Link>

          {/* Navigation Section */}
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
            Main Menu
          </div>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeMobileMenu}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-r from-[#144F5F]/90 to-[#0F3945]/80 text-[#9AE9FD] border-l-4 border-[#9AE9FD] shadow-md shadow-cyan-950/50'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-[#9AE9FD]' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="pt-4 border-t border-[#1B3A48] space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
            Preferences
          </div>
          {secondaryItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeMobileMenu}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-r from-[#144F5F]/90 to-[#0F3945]/80 text-[#9AE9FD] border-l-4 border-[#9AE9FD]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0 text-slate-400" />
                <span>{item.name}</span>
              </Link>
            );
          })}

          <button
            onClick={() => {
              if (onLogout) onLogout();
              closeMobileMenu();
            }}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all duration-200 w-full text-left mt-2"
          >
            <LogOut className="w-5 h-5 shrink-0 text-rose-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
