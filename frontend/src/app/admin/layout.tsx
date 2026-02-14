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
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Import global admin styles
import './admin-variables.css';
import './admin-layout.css';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  {
    title: 'Панель управления',
    icon: LayoutDashboard,
    href: '/admin',
  },
  {
    title: 'Аналитика',
    icon: BarChart3,
    href: '/admin/analytics',
    submenu: [
      { title: 'Обзор', href: '/admin/analytics' },
      { title: 'Удержание', href: '/admin/analytics/retention' },
      { title: 'Воронки', href: '/admin/analytics/funnels' },
      { title: 'Доход', href: '/admin/analytics/revenue' },
    ],
  },
  {
    title: 'Пользователи',
    icon: Users,
    href: '/admin/users',
    submenu: [
      { title: 'Все пользователи', href: '/admin/users' },
      { title: 'Верификация', href: '/admin/users/verification' },
      { title: 'Сегменты', href: '/admin/users/segments' },
    ],
  },
  {
    title: 'Модерация',
    icon: Shield,
    href: '/admin/moderation',
    submenu: [
      { title: 'Очередь', href: '/admin/moderation' },
      { title: 'Жалобы', href: '/admin/moderation/reports' },
      { title: 'Апелляции', href: '/admin/moderation/appeals' },
      { title: 'Правила авто-бана', href: '/admin/auto-ban-rules' },
    ],
  },
  {
    title: 'Монетизация',
    icon: DollarSign,
    href: '/admin/monetization',
    submenu: [
      { title: 'Доход', href: '/admin/monetization' },
      { title: 'Подписки', href: '/admin/monetization/subscriptions' },
      { title: 'Промокоды', href: '/admin/monetization/promo-codes' },
      { title: 'Подарки', href: '/admin/monetization/gifts' },
      { title: 'Возвраты', href: '/admin/monetization/refunds' },
      { title: 'Платежи', href: '/admin/monetization/payments' },
      { title: 'Тренды ARPU', href: '/admin/monetization/arpu-trends' },
      { title: 'Прогнозы', href: '/admin/monetization/forecasts' },
      { title: 'Анализ оттока', href: '/admin/monetization/churn-analysis' },
      { title: 'Бусты и суперлайки', href: '/admin/monetization/boost-analytics' },
      { title: 'Тесты цен', href: '/admin/monetization/pricing-tests' },
      { title: 'Отслеживание купонов', href: '/admin/monetization/coupon-tracking' },
      { title: 'Партнёры', href: '/admin/monetization/affiliates' },
      { title: 'Допродажи', href: '/admin/monetization/upsell' },
    ],
  },
  {
    title: 'Маркетинг',
    icon: Megaphone,
    href: '/admin/marketing',
    submenu: [
      { title: 'Кампании', href: '/admin/marketing' },
      { title: 'Push-уведомления', href: '/admin/marketing/push' },
      { title: 'Рефералы', href: '/admin/marketing/referrals' },
    ],
  },
  {
    title: 'AI и расширенные',
    icon: Sparkles,
    href: '/admin/advanced',
  },
  {
    title: 'Система',
    icon: Settings,
    href: '/admin/system',
    submenu: [
      { title: 'Здоровье', href: '/admin/system' },
      { title: 'Журнал аудита', href: '/admin/system/logs' },
      { title: 'Флаги функций', href: '/admin/system/flags' },
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
            <span className="nav-label">{isDark ? 'Светлая тема' : 'Тёмная тема'}</span>
          </button>
          <button className="logout-btn">
            <LogOut size={18} />
            <span className="nav-label">Выйти</span>
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
              <input type="text" placeholder="Поиск по аналитике, пользователям, отчётам..." />
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
                  <span className="admin-name">Администратор</span>
                  <span className="admin-role">Суперадмин</span>
                </div>
              </div>

              <div className={`profile-dropdown ${profileOpen ? 'show' : ''}`}>
                <button className="dropdown-item">
                  <User size={16} />
                  <span>Мой профиль</span>
                </button>
                <button className="dropdown-item">
                  <Settings size={16} />
                  <span>Настройки</span>
                </button>
                <button className="dropdown-item">
                  <HelpCircle size={16} />
                  <span>Поддержка</span>
                </button>
                <div style={{ height: '1px', background: 'var(--admin-glass-border)', margin: '8px 0' }} />
                <button className="dropdown-item" style={{ color: 'var(--neon-red)' }}>
                  <LogOut size={16} />
                  <span>Выйти</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="admin-content" onClick={() => setProfileOpen(false)}>
          <ErrorBoundary>
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
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

