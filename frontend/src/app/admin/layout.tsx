'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Shield,
  DollarSign,
  Megaphone,
  Settings,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  Moon,
  Sun,
  LogOut,
  Sparkles,
  Menu,
  X,
  User,
  HelpCircle,
} from 'lucide-react';

// Import global admin styles
import './admin-variables.css';
import './admin-layout.css';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/admin',
  },
  {
    title: 'Analytics',
    icon: BarChart3,
    href: '/admin/analytics',
    submenu: [
      { title: 'Overview', href: '/admin/analytics' },
      { title: 'Retention', href: '/admin/analytics/retention' },
      { title: 'Funnels', href: '/admin/analytics/funnels' },
      { title: 'Revenue', href: '/admin/analytics/revenue' },
    ],
  },
  {
    title: 'Users',
    icon: Users,
    href: '/admin/users',
    submenu: [
      { title: 'All Users', href: '/admin/users' },
      { title: 'Verification', href: '/admin/users/verification' },
      { title: 'Segments', href: '/admin/users/segments' },
    ],
  },
  {
    title: 'Moderation',
    icon: Shield,
    href: '/admin/moderation',
    submenu: [
      { title: 'Queue', href: '/admin/moderation' },
      { title: 'Reports', href: '/admin/moderation/reports' },
      { title: 'Appeals', href: '/admin/moderation/appeals' },
    ],
  },
  {
    title: 'Monetization',
    icon: DollarSign,
    href: '/admin/monetization',
    submenu: [
      { title: 'Revenue', href: '/admin/monetization' },
      { title: 'Subscriptions', href: '/admin/monetization/subscriptions' },
      { title: 'Promo Codes', href: '/admin/monetization/promos' },
    ],
  },
  {
    title: 'Marketing',
    icon: Megaphone,
    href: '/admin/marketing',
    submenu: [
      { title: 'Campaigns', href: '/admin/marketing' },
      { title: 'Push Notifications', href: '/admin/marketing/push' },
      { title: 'Referrals', href: '/admin/marketing/referrals' },
    ],
  },
  {
    title: 'AI & Advanced',
    icon: Sparkles,
    href: '/admin/advanced',
  },
  {
    title: 'System',
    icon: Settings,
    href: '/admin/system',
    submenu: [
      { title: 'Health', href: '/admin/system' },
      { title: 'Audit Logs', href: '/admin/system/logs' },
      { title: 'Feature Flags', href: '/admin/system/flags' },
    ],
  },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const pathname = usePathname();

  // Auto-expand active menu and close mobile sidebar on navigation
  useEffect(() => {
    const activeMenu = menuItems.find(
      (item) =>
        item.submenu?.some((sub) => pathname === sub.href) ||
        pathname === item.href
    );
    setExpandedMenu(activeMenu && activeMenu.submenu ? activeMenu.title : null);
    setMobileOpen(false);
  }, [pathname]);

  const toggleMenu = (title: string) => {
    if (collapsed) {
      setCollapsed(false);
      setExpandedMenu(title);
    } else {
      setExpandedMenu(expandedMenu === title ? null : title);
    }
  };

  return (
    <div className={`admin-layout ${isDark ? 'dark-mode' : 'light-mode'}`}>
      {/* Sidebar Overlay for Mobile */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'show' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`admin-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
      >
        {/* Logo */}
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">💘</span>
            <span className="logo-text">MambaX Admin</span>
          </div>
          <button
            className="collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              item.submenu?.some((sub) => pathname === sub.href);
            const isExpanded = expandedMenu === item.title;
            const Icon = item.icon;

            return (
              <div key={item.title} className="nav-item-wrapper">
                {item.submenu ? (
                  <>
                    <button
                      className={`nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => toggleMenu(item.title)}
                    >
                      <Icon size={20} />
                      <span className="nav-label">{item.title}</span>
                      <span
                        className="nav-arrow"
                        style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                      >
                        <ChevronRight size={16} />
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isExpanded && !collapsed && (
                        <motion.div
                          className="submenu"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                        >
                          {item.submenu.map((sub) => (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={`submenu-item ${pathname === sub.href ? 'active' : ''}`}
                            >
                              {sub.title}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                  >
                    <Icon size={20} />
                    <span className="nav-label">{item.title}</span>
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <button className="theme-toggle" onClick={() => setIsDark(!isDark)}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            <span className="nav-label">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button className="logout-btn">
            <LogOut size={18} />
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="admin-main">
        {/* Top Bar */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <button
              className="mobile-toggle"
              onClick={() => {
                setMobileOpen(true);
                setCollapsed(false);
              }}
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
            <div className="search-box">
              <Search size={18} />
              <input type="text" placeholder="Search insights, users, reports..." />
            </div>
          </div>

          <div className="topbar-right">
            <button className="topbar-btn notification-btn" aria-label="Notifications">
              <Bell size={20} />
              <span className="notification-badge">3</span>
            </button>

            <div className="admin-profile-wrapper">
              <div
                className="admin-profile"
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <div className="admin-avatar">A</div>
                <div className="admin-info">
                  <span className="admin-name">Admin User</span>
                  <span className="admin-role">Super Admin</span>
                </div>
              </div>

              <div className={`profile-dropdown ${profileOpen ? 'show' : ''}`}>
                <button className="dropdown-item">
                  <User size={16} />
                  <span>My Profile</span>
                </button>
                <button className="dropdown-item">
                  <Settings size={16} />
                  <span>Settings</span>
                </button>
                <button className="dropdown-item">
                  <HelpCircle size={16} />
                  <span>Support</span>
                </button>
                <div style={{ height: '1px', background: 'var(--admin-glass-border)', margin: '8px 0' }} />
                <button className="dropdown-item" style={{ color: 'var(--neon-red)' }}>
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="admin-content" onClick={() => setProfileOpen(false)}>
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

