'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Sparkles,
  Wand2,
  Target,
  Sliders,
  MessageSquare,
  FileBarChart,
  ChevronRight,
  Zap,
  Calendar,
  Briefcase,
  Globe,
  Accessibility,
  Video,
  Smartphone,
  Gauge,
  Home,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { advancedApi } from '@/services/advancedApi';
import styles from '../admin.module.css';

interface Stats {
  aiModels: number;
  perfScore: number;
  partners: number;
  accessScore: number;
  loading: boolean;
  error: string | null;
}

export default function AdvancedPage() {
  const shouldReduceMotion = useReducedMotion();

  const [stats, setStats] = useState<Stats>({
    aiModels: 0,
    perfScore: 0,
    partners: 0,
    accessScore: 0,
    loading: true,
    error: null
  });

  const [isRetrying, setIsRetrying] = useState(false);

  const loadStats = useCallback(async () => {
    setStats(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [ai, perf, partners, access] = await Promise.allSettled([
        advancedApi.getAIModels(),
        advancedApi.getPerformanceBudget(),
        advancedApi.getPartners(),
        advancedApi.getAccessibilityAudit()
      ]);

      // Count how many requests failed
      const failures = [ai, perf, partners, access].filter(r => r.status === 'rejected');

      setStats({
        aiModels: ai.status === 'fulfilled' ? ai.value.models.length : 0,
        perfScore: perf.status === 'fulfilled' ? perf.value.overall_score : 0,
        partners: partners.status === 'fulfilled' ? partners.value.partners.length : 0,
        accessScore: access.status === 'fulfilled' ? access.value.overall_score : 0,
        loading: false,
        error: failures.length === 4
          ? 'Unable to load dashboard statistics. Please check your connection.'
          : failures.length > 0
            ? `Some statistics failed to load (${failures.length}/4 requests failed).`
            : null
      });
    } catch (e) {
      console.error('Failed to load dashboard stats', e);
      setStats(prev => ({
        ...prev,
        loading: false,
        error: 'An unexpected error occurred while loading statistics.'
      }));
    }
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    await loadStats();
    setIsRetrying(false);
  };

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const menuItems = [
    { href: '/admin/advanced/ai', icon: <Wand2 size={24} />, label: 'AI Content', desc: 'Content generation' },
    { href: '/admin/advanced/algorithm', icon: <Sliders size={24} />, label: 'Algorithm', desc: 'Match tuning' },
    { href: '/admin/advanced/reports', icon: <FileBarChart size={24} />, label: 'Reports', desc: 'Custom analytics' },
    { href: '/admin/advanced/recommendations', icon: <Target size={24} />, label: 'Rec. Engine', desc: 'Engine status' },
    { href: '/admin/advanced/events', icon: <Calendar size={24} />, label: 'Events', desc: 'Virtual dating' },
    { href: '/admin/advanced/partners', icon: <Briefcase size={24} />, label: 'Partners', desc: 'White-label' },
    { href: '/admin/advanced/localization', icon: <Globe size={24} />, label: 'Localization', desc: 'Languages' },
    { href: '/admin/advanced/calls', icon: <Video size={24} />, label: 'Calls', desc: 'A/V analytics' },
    { href: '/admin/advanced/accessibility', icon: <Accessibility size={24} />, label: 'Accessibility', desc: 'Audit score' },
    { href: '/admin/advanced/performance', icon: <Gauge size={24} />, label: 'Performance', desc: 'Web vitals' },
    { href: '/admin/advanced/pwa', icon: <Smartphone size={24} />, label: 'PWA Stats', desc: 'App usage' },
    { href: '/admin/advanced/icebreakers', icon: <MessageSquare size={24} />, label: 'Icebreakers', desc: 'Manage openers' },
    { href: '/admin/advanced/web3', icon: <Zap size={24} />, label: 'Web3 & Metaverse', desc: 'NFT & Smart Contracts' },
  ];

  // Animation variants - optimized for performance
  const headerVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : -20 },
    visible: { opacity: 1, y: 0 }
  };

  const statsVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: shouldReduceMotion ? 1 : 0.95 },
    visible: { opacity: 1, scale: 1 }
  };

  // Skeleton loader component
  const StatSkeleton = () => (
    <div className={styles.quickStats} role="status" aria-label="Loading statistics">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`${styles.miniStat} ${styles.skeletonStat}`}>
          <span className={styles.skeletonLabel}></span>
          <span className={styles.skeletonValue}></span>
        </div>
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );

  // Error display component
  const ErrorDisplay = ({ message, onRetry, isRetrying }: {
    message: string;
    onRetry: () => void;
    isRetrying: boolean;
  }) => (
    <div className={styles.errorContainer} role="alert">
      <AlertCircle size={48} className={styles.errorIcon} />
      <h3 className={styles.errorTitle}>Failed to Load Statistics</h3>
      <p className={styles.errorMessage}>{message}</p>
      <button
        className={styles.retryButton}
        onClick={onRetry}
        disabled={isRetrying}
        aria-label="Retry loading statistics"
      >
        <RefreshCw size={18} className={isRetrying ? 'animate-spin' : ''} />
        {isRetrying ? 'Retrying...' : 'Try Again'}
      </button>
    </div>
  );

  // Keyboard navigation handler for breadcrumb
  const handleBreadcrumbKeyDown = (e: React.KeyboardEvent, href: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      window.location.href = href;
    }
  };

  return (
    <div className={styles.advancedDashboard}>
      {/* Breadcrumb Navigation - Enhanced Accessibility */}
      <nav
        className={styles.breadcrumb}
        aria-label="Breadcrumb navigation"
      >
        <ol className={styles.breadcrumbList} role="list">
          <li className={styles.breadcrumbItem}>
            <Link
              href="/admin"
              className={styles.breadcrumbLink}
              onKeyDown={(e) => handleBreadcrumbKeyDown(e, '/admin')}
              aria-label="Go to Dashboard"
            >
              <Home size={14} aria-hidden="true" />
              <span>Dashboard</span>
            </Link>
          </li>
          <li className={styles.breadcrumbSeparator} aria-hidden="true">
            <ChevronRight size={14} />
          </li>
          <li className={styles.breadcrumbItem} aria-current="page">
            <span className={styles.breadcrumbCurrent}>
              <Sparkles size={14} aria-hidden="true" />
              <span>Advanced Features</span>
            </span>
          </li>
        </ol>
      </nav>

      <div className={styles.headerSection}>
        <motion.div
          className={styles.headerContent}
          variants={headerVariants}
          initial="hidden"
          animate="visible"
          transition={{
            duration: shouldReduceMotion ? 0 : 0.4,
            ease: [0.16, 1, 0.3, 1]
          }}
        >
          <h1 className={styles.headerTitle}>Advanced Features</h1>
          <p className={styles.headerDescription}>
            Manage AI, algorithms, and system performance
          </p>
        </motion.div>

        {stats.loading ? (
          <StatSkeleton />
        ) : stats.error && stats.aiModels === 0 && stats.perfScore === 0 && stats.partners === 0 ? (
          // Show inline error only if ALL stats failed
          <div className={styles.quickStats}>
            <span className="text-[13px] text-[var(--admin-text-muted)]">
              Stats unavailable
            </span>
          </div>
        ) : (
          <motion.div
            className={styles.quickStats}
            variants={statsVariants}
            initial="hidden"
            animate="visible"
            transition={{
              duration: shouldReduceMotion ? 0 : 0.3,
              delay: shouldReduceMotion ? 0 : 0.2
            }}
            aria-label="Quick statistics"
          >
            <div className={styles.miniStat}>
              <span className={styles.miniStatLabel}>AI Models</span>
              <span className={styles.miniStatValue}>{stats.aiModels}</span>
            </div>
            <div className={styles.miniStat}>
              <span className={styles.miniStatLabel}>Perf. Score</span>
              <span className={`${styles.miniStatValue} ${stats.perfScore > 90 ? styles.miniStatValueSuccess : styles.miniStatValueWarning}`}>
                {stats.perfScore}
              </span>
            </div>
            <div className={styles.miniStat}>
              <span className={styles.miniStatLabel}>Partners</span>
              <span className={styles.miniStatValue}>{stats.partners}</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Error boundary display for complete stats failure */}
      {stats.error && stats.aiModels === 0 && stats.perfScore === 0 && stats.partners === 0 && !stats.loading && (
        <ErrorDisplay
          message={stats.error}
          onRetry={handleRetry}
          isRetrying={isRetrying}
        />
      )}

      <div className={styles.navGrid}>
        {menuItems.map((item, index) => (
          <motion.div
            key={item.href}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{
              delay: shouldReduceMotion ? 0 : index * 0.03,
              duration: shouldReduceMotion ? 0 : 0.3,
              ease: [0.16, 1, 0.3, 1]
            }}
          >
            <Link
              href={item.href}
              className={styles.navCard}
              aria-label={`${item.label}: ${item.desc}`}
            >
              <div className={styles.iconBox} aria-hidden="true">
                {item.icon}
              </div>
              <div className={styles.navInfo}>
                <span className={styles.navLabel}>{item.label}</span>
                <span className={styles.navDesc}>{item.desc}</span>
              </div>
              <ChevronRight size={16} className={styles.arrow} aria-hidden="true" />
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
