'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Users, Crown, RefreshCw, Globe } from 'lucide-react';
import { adminApi, GeoHeatmapPoint } from '@/services/adminApi';

interface GeoHeatmapData {
  points: GeoHeatmapPoint[];
  total_users: number;
  total_vip: number;
  top_cities: GeoHeatmapPoint[];
}

export default function GeoHeatmap() {
  const [data, setData] = useState<GeoHeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredCity, setHoveredCity] = useState<GeoHeatmapPoint | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.analytics.getGeoHeatmap();
      setData(result);
    } catch (err) {
      console.error('Failed to load geo heatmap:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="glass-panel p-6 animate-pulse">
        <div className="h-6 w-48 bg-slate-700/50 rounded mb-4" />
        <div className="h-[400px] bg-slate-800/30 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  const maxUsers = Math.max(...data.points.map(p => p.users), 1);

  // Map boundaries for Russia-centric view
  const mapBounds = { minLat: 41, maxLat: 68, minLng: 27, maxLng: 105 };
  const mapWidth = 800;
  const mapHeight = 400;

  const projectPoint = (lat: number, lng: number) => {
    const x = ((lng - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng)) * mapWidth;
    const y = ((mapBounds.maxLat - lat) / (mapBounds.maxLat - mapBounds.minLat)) * mapHeight;
    return { x, y };
  };

  const getBubbleRadius = (users: number) => {
    const minR = 6;
    const maxR = 35;
    return minR + (users / maxUsers) * (maxR - minR);
  };

  const getBubbleColor = (users: number) => {
    const ratio = users / maxUsers;
    if (ratio > 0.6) return 'rgba(239, 68, 68, 0.7)';
    if (ratio > 0.3) return 'rgba(249, 115, 22, 0.65)';
    if (ratio > 0.1) return 'rgba(234, 179, 8, 0.6)';
    return 'rgba(59, 130, 246, 0.55)';
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Globe size={20} className="text-blue-500" />
          <h3 className="text-slate-100" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
            География пользователей
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="text-slate-400" style={{ fontSize: '0.8rem' }}>
            {data.points.length} городов
          </span>
          <button
            onClick={fetchData}
            style={{
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '0.5rem',
              padding: '0.4rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <RefreshCw size={14} className="text-blue-500" />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '0.75rem',
          padding: '0.75rem 1rem',
        }}>
          <div className="text-slate-400" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Всего</div>
          <div className="text-blue-500" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            {data.total_users.toLocaleString()}
          </div>
        </div>
        <div style={{
          background: 'rgba(234, 179, 8, 0.1)',
          border: '1px solid rgba(234, 179, 8, 0.2)',
          borderRadius: '0.75rem',
          padding: '0.75rem 1rem',
        }}>
          <div className="text-slate-400" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>VIP</div>
          <div className="text-yellow-500" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            {data.total_vip.toLocaleString()}
          </div>
        </div>
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '0.75rem',
          padding: '0.75rem 1rem',
        }}>
          <div className="text-slate-400" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Топ город</div>
          <div className="text-emerald-500" style={{ fontSize: '1.125rem', fontWeight: 700 }}>
            {data.top_cities[0]?.city || '—'}
          </div>
        </div>
      </div>

      {/* Map SVG */}
      <div style={{
        position: 'relative',
        background: 'rgba(15, 23, 42, 0.6)',
        borderRadius: '1rem',
        border: '1px solid rgba(51, 65, 85, 0.4)',
        overflow: 'hidden',
      }}>
        <svg
          viewBox={`0 0 ${mapWidth} ${mapHeight}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map(f => (
            <line
              key={`h-${f}`}
              x1={0} y1={mapHeight * f} x2={mapWidth} y2={mapHeight * f}
              stroke="rgba(51, 65, 85, 0.3)" strokeWidth={0.5}
            />
          ))}
          {[0.25, 0.5, 0.75].map(f => (
            <line
              key={`v-${f}`}
              x1={mapWidth * f} y1={0} x2={mapWidth * f} y2={mapHeight}
              stroke="rgba(51, 65, 85, 0.3)" strokeWidth={0.5}
            />
          ))}

          {/* City bubbles */}
          {data.points.map((point, i) => {
            const { x, y } = projectPoint(point.lat, point.lng);
            const r = getBubbleRadius(point.users);
            const color = getBubbleColor(point.users);
            const isHovered = hoveredCity?.city === point.city;

            return (
              <g
                key={point.city + i}
                onMouseEnter={() => setHoveredCity(point)}
                onMouseLeave={() => setHoveredCity(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Glow */}
                <circle cx={x} cy={y} r={r * 1.8} fill={color} opacity={0.15} />
                {/* Main bubble */}
                <circle
                  cx={x} cy={y} r={isHovered ? r * 1.2 : r}
                  fill={color}
                  stroke={isHovered ? '#fff' : 'rgba(255,255,255,0.2)'}
                  strokeWidth={isHovered ? 2 : 0.5}
                  style={{ transition: 'r 0.2s, stroke 0.2s' }}
                />
                {/* City label for large bubbles */}
                {r > 15 && (
                  <text
                    x={x} y={y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#fff"
                    fontSize={r > 25 ? 10 : 8}
                    fontWeight={600}
                    style={{ pointerEvents: 'none' }}
                  >
                    {point.city.length > 8 ? point.city.slice(0, 7) + '…' : point.city}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredCity && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: '0.75rem',
              padding: '0.75rem 1rem',
              minWidth: '180px',
              backdropFilter: 'blur(12px)',
              zIndex: 10,
            }}
          >
            <div className="text-slate-100" style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={14} className="text-blue-500" />
              {hoveredCity.city}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem' }}>
              <div className="text-slate-400" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span><Users size={12} style={{ display: 'inline', marginRight: 4 }} />Пользователи</span>
                <span className="text-slate-100" style={{ fontWeight: 600 }}>{hoveredCity.users.toLocaleString()}</span>
              </div>
              <div className="text-slate-400" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span><Crown size={12} style={{ display: 'inline', marginRight: 4 }} />VIP</span>
                <span className="text-yellow-500" style={{ fontWeight: 600 }}>{hoveredCity.vip.toLocaleString()}</span>
              </div>
              <div className="text-slate-400" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span>Активные</span>
                <span className="text-emerald-500" style={{ fontWeight: 600 }}>{hoveredCity.active.toLocaleString()}</span>
              </div>
              <div className="text-slate-400" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderTop: '1px solid rgba(51,65,85,0.4)', paddingTop: '0.25rem', marginTop: '0.25rem' }}>
                <span>VIP %</span>
                <span className="text-yellow-500" style={{ fontWeight: 600 }}>
                  {((hoveredCity.vip / Math.max(hoveredCity.users, 1)) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Top cities table */}
      <div style={{ marginTop: '1.5rem' }}>
        <h4 className="text-slate-400" style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          Топ-10 городов
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {data.top_cities.slice(0, 10).map((city, i) => {
            const barWidth = (city.users / maxUsers) * 100;
            return (
              <div
                key={city.city}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  background: hoveredCity?.city === city.city ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={() => setHoveredCity(city)}
                onMouseLeave={() => setHoveredCity(null)}
              >
                <span className="text-slate-500" style={{ width: '1.5rem', fontSize: '0.75rem', fontWeight: 600, textAlign: 'right' }}>
                  {i + 1}
                </span>
                <span className="text-slate-200" style={{ width: '120px', fontSize: '0.8rem', fontWeight: 500 }}>
                  {city.city}
                </span>
                <div style={{ flex: 1, height: '6px', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '3px', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ duration: 0.6, delay: i * 0.05 }}
                    style={{
                      height: '100%',
                      borderRadius: '3px',
                      background: `linear-gradient(90deg, ${getBubbleColor(city.users)}, ${getBubbleColor(city.users)})`,
                    }}
                  />
                </div>
                <span className="text-slate-100" style={{ width: '60px', fontSize: '0.8rem', fontWeight: 600, textAlign: 'right' }}>
                  {city.users.toLocaleString()}
                </span>
                <span className="text-yellow-500" style={{ width: '40px', fontSize: '0.7rem', textAlign: 'right' }}>
                  {city.vip}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
