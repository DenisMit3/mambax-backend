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
  const [isDark, setIsDark] = useState(true);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const pathname = usePathname();

  // Auto-expand active menu
  useEffect(() => {
    const activeMenu = menuItems.find(
      (item) =>
        item.submenu?.some((sub) => pathname === sub.href) ||
        pathname === item.href
    );
    if (activeMenu?.submenu) {
      setExpandedMenu(activeMenu.title);
    }
  }, [pathname]);

  const toggleMenu = (title: string) => {
    setExpandedMenu(expandedMenu === title ? null : title);
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <motion.aside
        className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}
        animate={{ width: collapsed ? 80 : 280 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {/* Logo */}
        <div className="sidebar-header">
          <motion.div
            className="logo"
            animate={{ opacity: collapsed ? 0 : 1 }}
          >
            {!collapsed && (
              <>
                <span className="logo-icon">💘</span>
                <span className="logo-text">MambaX Admin</span>
              </>
            )}
            {collapsed && <span className="logo-icon">💘</span>}
          </motion.div>
          <button
            className="collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
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
                      {!collapsed && (
                        <>
                          <span className="nav-label">{item.title}</span>
                          <motion.span
                            className="nav-arrow"
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                          >
                            <ChevronRight size={16} />
                          </motion.span>
                        </>
                      )}
                    </button>
                    <AnimatePresence>
                      {isExpanded && !collapsed && (
                        <motion.div
                          className="submenu"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          {item.submenu.map((sub) => (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={`submenu-item ${pathname === sub.href ? 'active' : ''
                                }`}
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
                    {!collapsed && (
                      <span className="nav-label">{item.title}</span>
                    )}
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
            {!collapsed && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
          <button className="logout-btn">
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="admin-main">
        {/* Top Bar */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <div className="search-box">
              <Search size={18} />
              <input type="text" placeholder="Search..." />
            </div>
          </div>
          <div className="topbar-right">
            <button className="topbar-btn notification-btn">
              <Bell size={20} />
              <span className="notification-badge">3</span>
            </button>
            <div className="admin-profile">
              <div className="admin-avatar">A</div>
              <div className="admin-info">
                <span className="admin-name">Admin</span>
                <span className="admin-role">Super Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="admin-content">
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

      {/* Styles loaded from admin-variables.css and admin-layout.css */}
    </div>
  );
}
