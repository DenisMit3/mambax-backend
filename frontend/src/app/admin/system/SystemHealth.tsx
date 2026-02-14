'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Server,
  Database,
  Activity,
  AlertTriangle,
  CheckCircle,
  Zap,
  Globe,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { adminApi } from '@/services/adminApi';

// Интерфейс сервиса для отображения статуса
interface ServiceItem {
  name: string;
  status: string;
  uptime: string;
  response_time: string;
  icon?: React.ReactNode;
}

// Определение иконки по имени сервиса
const getServiceIcon = (name: string) => {
  if (name.includes('API')) return <Server size={18} />;
  if (name.includes('Database')) return <Database size={18} />;
  if (name.includes('Cache') || name.includes('Redis')) return <Zap size={18} />;
  if (name.includes('Socket')) return <Activity size={18} />;
  if (name.includes('Auth')) return <Lock size={18} />;
  return <Globe size={18} />;
};

export default function SystemHealth() {
  const [services, setServices] = useState<ServiceItem[]>([]);

  // Загрузка данных о здоровье системы
  const loadHealth = () => {
    adminApi.system.getHealth().then(data => {
      setServices(data.services.map((s: ServiceItem) => ({
        ...s,
        icon: getServiceIcon(s.name)
      })));
    }).catch(err => console.error(err));
  };

  useEffect(() => {
    loadHealth();
  }, []);

  return (
    <div className="system-health glass-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Activity size={20} style={{ color: '#10b981' }} />
          <h3>System Health</h3>
        </div>
        <button className="refresh-btn" onClick={loadHealth}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="services-grid">
        {services.map((service, index) => (
          <motion.div
            key={service.name}
            className={`service-card ${service.status}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="service-header">
              <div className="service-icon">
                {service.icon}
              </div>
              <div className={`status-indicator ${service.status}`}>
                {service.status === 'healthy' && <CheckCircle size={14} />}
                {service.status === 'warning' && <AlertTriangle size={14} />}
                {service.status === 'degraded' && <AlertTriangle size={14} />}
                {service.status === 'down' && <AlertTriangle size={14} color="red" />}
              </div>
            </div>
            <div className="service-name">{service.name}</div>
            <div className="service-stats">
              <div className="stat">
                <span className="label">Uptime</span>
                <span className="value">{service.uptime}</span>
              </div>
              <div className="stat">
                <span className="label">Ответ</span>
                <span className="value">{service.response_time}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <style jsx>{`
        .system-health {
          padding: 24px;
          margin-bottom: 24px;
        }
        
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        
        .panel-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .panel-title h3 {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
        }
        
        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          color: #94a3b8;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .refresh-btn:hover {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }
        
        .services-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
        }
        
        @media (max-width: 1400px) {
          .services-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        
        @media (max-width: 800px) {
          .services-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        .service-card {
          padding: 20px;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.1);
          transition: all 0.2s;
        }
        
        .service-card:hover {
          background: rgba(30, 41, 59, 0.6);
        }
        
        .service-card.healthy {
          border-color: rgba(16, 185, 129, 0.3);
        }
        
        .service-card.warning {
          border-color: rgba(249, 115, 22, 0.3);
        }
        
        .service-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        
        .service-icon {
          color: #94a3b8;
        }
        
        .status-indicator {
          display: flex;
          align-items: center;
        }
        
        .status-indicator.healthy {
          color: #10b981;
        }
        
        .status-indicator.warning {
          color: #f97316;
        }
        
        .service-name {
          font-size: 14px;
          font-weight: 600;
          color: #f1f5f9;
          margin-bottom: 12px;
        }
        
        .service-stats {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .stat {
          display: flex;
          justify-content: space-between;
        }
        
        .stat .label {
          font-size: 11px;
          color: #64748b;
        }
        
        .stat .value {
          font-size: 12px;
          font-weight: 600;
          color: #10b981;
        }
      `}</style>
    </div>
  );
}
