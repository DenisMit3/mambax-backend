'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Home, ChevronRight, Plus, Sparkles, Search, Filter,
  Users, Clock, Star, Crown, Trash2, Edit2, Eye, X, ArrowUpDown,
  ChevronDown, Loader2, RefreshCw, Video, Coffee, Gamepad2, BookOpen
} from 'lucide-react';
import { advancedApi, Event } from '@/services/advancedApi';

type EventStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'start_date' | 'registered'>('start_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [formData, setFormData] = useState({
    name: '', event_type: 'speed-dating', start_date: '', max_participants: 50, is_premium: false
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const eventTypes = [
    { id: 'speed-dating', name: 'Speed Dating', icon: Clock },
    { id: 'video-mixer', name: 'Video Mixer', icon: Video },
    { id: 'game-night', name: 'Game Night', icon: Gamepad2 },
    { id: 'coffee-chat', name: 'Coffee Chat', icon: Coffee },
    { id: 'book-club', name: 'Book Club', icon: BookOpen }
  ];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await advancedApi.getEvents();
      setEvents(res.events);
      setStats(res.stats);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    let data = [...events];
    if (searchQuery) data = data.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterStatus !== 'all') data = data.filter(e => e.status === filterStatus);
    data.sort((a, b) => {
      const av = sortField === 'start_date' ? new Date(a.start_date).getTime() : a.registered;
      const bv = sortField === 'start_date' ? new Date(b.start_date).getTime() : b.registered;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return data;
  }, [events, searchQuery, filterStatus, sortField, sortDir]);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Event name is required';
    if (!formData.start_date) errors.start_date = 'Start date is required';
    if (formData.max_participants < 2) errors.max_participants = 'Minimum 2 participants';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await advancedApi.createEvent({
        name: formData.name,
        event_type: formData.event_type,
        start_date: new Date(formData.start_date).toISOString(),
        max_participants: formData.max_participants,
        is_premium: formData.is_premium
      });
      closeModal();
      loadData();
    } catch (e) { setFormErrors({ submit: 'Failed to create event' }); }
    finally { setSubmitting(false); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !validate()) return;
    setSubmitting(true);
    try {
      await advancedApi.updateEvent(editingEvent.id, {
        name: formData.name,
        event_type: formData.event_type,
        start_date: new Date(formData.start_date).toISOString(),
        max_participants: formData.max_participants,
        is_premium: formData.is_premium
      });
      closeModal();
      loadData();
    } catch (e) { setFormErrors({ submit: 'Failed to update event' }); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (ev: Event) => {
    if (!confirm(`Delete "${ev.name}"? This action cannot be undone.`)) return;
    setDeletingId(ev.id);
    try {
      await advancedApi.deleteEvent(ev.id);
      loadData();
    } catch (e) { console.error('Failed to delete event', e); }
    finally { setDeletingId(null); }
  };

  const openEditModal = (ev: Event) => {
    // Конвертируем ISO дату в формат datetime-local
    const localDate = ev.start_date ? new Date(ev.start_date).toISOString().slice(0, 16) : '';
    setFormData({
      name: ev.name,
      event_type: ev.type,
      start_date: localDate,
      max_participants: ev.max_participants,
      is_premium: ev.is_premium
    });
    setEditingEvent(ev);
    setFormErrors({});
    setShowModal(true);
  };

  const openCreateModal = () => {
    setFormData({ name: '', event_type: 'speed-dating', start_date: '', max_participants: 50, is_premium: false });
    setEditingEvent(null);
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEvent(null);
    setFormData({ name: '', event_type: 'speed-dating', start_date: '', max_participants: 50, is_premium: false });
    setFormErrors({});
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'blue';
      case 'live': return 'green';
      case 'completed': return 'gray';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getEventIcon = (type: string) => {
    const et = eventTypes.find(t => t.id === type);
    return et ? <et.icon size={18} /> : <Calendar size={18} />;
  };

  return (
    <div className="page">
      <nav className="bc"><Link href="/admin"><Home size={14} /></Link><ChevronRight size={14} /><Link href="/admin/advanced"><Sparkles size={14} /></Link><ChevronRight size={14} /><span><Calendar size={14} />Events</span></nav>

      <div className="header">
        <div><h1>Virtual Dating Events</h1><p>Create and manage online dating experiences</p></div>
        <button className="btn pri" onClick={openCreateModal}><Plus size={18} />Create Event</button>
      </div>

      {stats && (
        <div className="stats">
          <div className="stat"><Calendar size={20} /><div><span>Events/Month</span><b>{stats.total_events_month}</b></div></div>
          <div className="stat"><Users size={20} /><div><span>Participants</span><b>{stats.total_participants}</b></div></div>
          <div className="stat"><Star size={20} /><div><span>Satisfaction</span><b>{stats.avg_satisfaction}/5</b></div></div>
          <div className="stat"><Crown size={20} /><div><span>Matches</span><b>{stats.matches_from_events}</b></div></div>
        </div>
      )}

      <div className="filters">
        <div className="search"><Search size={18} /><input placeholder="Search events..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="live">Live</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button onClick={loadData}><RefreshCw size={16} className={loading ? 'spin' : ''} /></button>
      </div>

      {loading ? <div className="loading"><Loader2 className="spin" size={32} /></div> : (
        <div className="events-grid">
          {filtered.length === 0 ? (
            <div className="empty"><Calendar size={48} /><p>No events found</p><button className="btn pri" onClick={openCreateModal}><Plus size={16} />Create Event</button></div>
          ) : filtered.map((ev, i) => (
            <motion.div key={ev.id} className="event-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <div className="card-head">
                <div className="type-icon">{getEventIcon(ev.type)}</div>
                <span className={`status ${getStatusColor(ev.status)}`}>{ev.status}</span>
                {ev.is_premium && <span className="premium"><Crown size={12} />Premium</span>}
              </div>
              <h3>{ev.name}</h3>
              <p className="type">{eventTypes.find(t => t.id === ev.type)?.name || ev.type}</p>
              <div className="meta">
                <div><Clock size={14} />{formatDate(ev.start_date)}</div>
                <div><Users size={14} />{ev.registered}/{ev.max_participants}</div>
              </div>
              <div className="progress"><div style={{ width: `${(ev.registered / ev.max_participants) * 100}%` }} /></div>
              <p className="host">Host: {ev.host || 'TBD'}</p>
              <div className="card-actions">
                <button onClick={() => setSelectedEvent(ev)}><Eye size={14} />View</button>
                <button onClick={() => openEditModal(ev)}><Edit2 size={14} />Edit</button>
                <button className="del" disabled={deletingId === ev.id} onClick={() => handleDelete(ev)}>
                  {deletingId === ev.id ? <Loader2 className="spin" size={14} /> : <Trash2 size={14} />}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal}>
            <motion.div className="modal" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
              <div className="mhead"><h2>{editingEvent ? 'Edit Event' : 'Create Event'}</h2><button onClick={closeModal}><X size={20} /></button></div>
              <form onSubmit={editingEvent ? handleEdit : handleCreate}>
                <div className="field">
                  <label>Event Name *</label>
                  <input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Friday Night Mixer" />
                  {formErrors.name && <span className="err">{formErrors.name}</span>}
                </div>
                <div className="field">
                  <label>Event Type</label>
                  <div className="type-grid">
                    {eventTypes.map(t => (
                      <button type="button" key={t.id} className={`type-btn ${formData.event_type === t.id ? 'active' : ''}`} onClick={() => setFormData(p => ({ ...p, event_type: t.id }))}>
                        <t.icon size={20} />{t.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="row">
                  <div className="field">
                    <label>Start Date & Time *</label>
                    <input type="datetime-local" value={formData.start_date} onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))} />
                    {formErrors.start_date && <span className="err">{formErrors.start_date}</span>}
                  </div>
                  <div className="field">
                    <label>Max Participants</label>
                    <input type="number" min={2} max={500} value={formData.max_participants} onChange={e => setFormData(p => ({ ...p, max_participants: Number(e.target.value) }))} />
                  </div>
                </div>
                <div className="field">
                  <label className="check-label">
                    <input type="checkbox" checked={formData.is_premium} onChange={e => setFormData(p => ({ ...p, is_premium: e.target.checked }))} />
                    <Crown size={16} />Premium Event (VIP members only)
                  </label>
                </div>
                {formErrors.submit && <div className="ferr">{formErrors.submit}</div>}
                <div className="mfoot">
                  <button type="button" className="btn sec" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn pri" disabled={submitting}>
                    {submitting ? <Loader2 className="spin" size={16} /> : editingEvent ? <Edit2 size={16} /> : <Plus size={16} />}
                    {editingEvent ? 'Save Changes' : 'Create Event'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedEvent(null)}>
            <motion.div className="modal" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
              <div className="mhead"><h2>Event Details</h2><button onClick={() => setSelectedEvent(null)}><X size={20} /></button></div>
              <div className="detail-content">
                <div className="detail-head">
                  <div className="type-icon lg">{getEventIcon(selectedEvent.type)}</div>
                  <div>
                    <h3>{selectedEvent.name}</h3>
                    <p>{eventTypes.find(t => t.id === selectedEvent.type)?.name}</p>
                  </div>
                  <span className={`status ${getStatusColor(selectedEvent.status)}`}>{selectedEvent.status}</span>
                </div>
                <div className="detail-grid">
                  <div><span>Start</span><b>{formatDate(selectedEvent.start_date)}</b></div>
                  <div><span>Registered</span><b>{selectedEvent.registered}/{selectedEvent.max_participants}</b></div>
                  <div><span>Host</span><b>{selectedEvent.host || 'Not Assigned'}</b></div>
                  <div><span>Type</span><b>{selectedEvent.is_premium ? 'Premium' : 'Free'}</b></div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .page{max-width:1400px;margin:0 auto}
        .bc{display:flex;align-items:center;gap:8px;margin-bottom:24px;color:var(--text-muted);font-size:13px}
        .bc a,.bc span{display:flex;align-items:center;gap:4px;padding:6px 10px;border-radius:8px;text-decoration:none;color:inherit}
        .bc a:hover{background:var(--glass-bg-light);color:var(--text-primary)}
        .bc span{color:var(--neon-purple);background:rgba(168,85,247,0.1)}
        .header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px;flex-wrap:wrap;gap:16px}
        .header h1{font-size:28px;font-weight:800;background:linear-gradient(135deg,var(--text-primary),var(--text-secondary));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0}
        .header p{color:var(--text-secondary);margin:4px 0 0}
        .btn{display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;border:none;transition:all 0.2s}
        .btn.pri{background:var(--gradient-primary);color:#fff}
        .btn.pri:hover{box-shadow:var(--glow-purple)}
        .btn.pri:disabled{opacity:0.6}
        .btn.sec{background:var(--glass-bg-light);border:1px solid var(--glass-border);color:var(--text-primary)}
        .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
        .stat{display:flex;align-items:center;gap:14px;padding:18px;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:14px}
        .stat svg{color:var(--neon-purple)}
        .stat span{font-size:11px;color:var(--text-muted);text-transform:uppercase}
        .stat b{font-size:22px;color:var(--text-primary)}
        .filters{display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap}
        .search{display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--glass-bg-light);border:1px solid var(--glass-border);border-radius:10px;flex:1;min-width:200px}
        .search input{background:none;border:none;outline:none;color:var(--text-primary);width:100%}
        .filters select,.filters button{padding:10px 14px;background:var(--glass-bg-light);border:1px solid var(--glass-border);border-radius:10px;color:var(--text-secondary);cursor:pointer}
        .loading{display:flex;justify-content:center;padding:60px}
        .events-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
        .event-card{background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:16px;padding:20px;transition:all 0.2s}
        .event-card:hover{border-color:var(--neon-purple);box-shadow:var(--glow-purple)}
        .card-head{display:flex;align-items:center;gap:10px;margin-bottom:14px}
        .type-icon{width:40px;height:40px;background:var(--glass-bg-light);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--neon-purple)}
        .type-icon.lg{width:56px;height:56px}
        .status{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;text-transform:capitalize}
        .status.blue{background:rgba(59,130,246,0.2);color:var(--neon-blue)}
        .status.green{background:rgba(16,185,129,0.2);color:var(--neon-green)}
        .status.gray{background:var(--glass-bg-light);color:var(--text-muted)}
        .status.red{background:rgba(239,68,68,0.2);color:var(--neon-red)}
        .premium{display:flex;align-items:center;gap:4px;padding:4px 10px;background:rgba(249,115,22,0.2);border-radius:20px;font-size:11px;font-weight:600;color:var(--neon-orange)}
        .event-card h3{font-size:17px;font-weight:700;color:var(--text-primary);margin:0 0 4px}
        .event-card .type{font-size:13px;color:var(--text-muted);margin:0 0 14px}
        .meta{display:flex;gap:16px;font-size:13px;color:var(--text-secondary);margin-bottom:12px}
        .meta div{display:flex;align-items:center;gap:6px}
        .progress{height:4px;background:var(--glass-bg-light);border-radius:2px;margin-bottom:12px}
        .progress div{height:100%;background:var(--neon-green);border-radius:2px}
        .host{font-size:12px;color:var(--text-muted);margin:0 0 14px}
        .card-actions{display:flex;gap:8px}
        .card-actions button{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px;background:var(--glass-bg-light);border:1px solid var(--glass-border);border-radius:8px;font-size:12px;color:var(--text-secondary);cursor:pointer}
        .card-actions button:hover{color:var(--text-primary);border-color:var(--neon-blue)}
        .card-actions .del:hover{color:var(--neon-red);border-color:var(--neon-red)}
        .card-actions button:disabled{opacity:0.5;cursor:not-allowed}
        .empty{grid-column:1/-1;text-align:center;padding:60px;color:var(--text-muted)}
        .empty svg{margin-bottom:16px;opacity:0.5}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px}
        .modal{background:var(--admin-bg-secondary);border:1px solid var(--glass-border);border-radius:18px;width:100%;max-width:540px}
        .mhead{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:1px solid var(--glass-border)}
        .mhead h2{font-size:17px;color:var(--text-primary);margin:0}
        .mhead button{padding:6px;background:none;border:none;color:var(--text-muted);cursor:pointer}
        form{padding:22px}
        .field{margin-bottom:18px}
        .field label{display:block;font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:6px}
        .field input,.field select{width:100%;padding:11px 14px;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:10px;color:var(--text-primary);outline:none}
        .field input:focus{border-color:var(--neon-purple)}
        .err{color:var(--neon-red);font-size:12px;margin-top:4px;display:block}
        .ferr{padding:10px;background:rgba(239,68,68,0.1);border-radius:8px;color:var(--neon-red);font-size:13px;margin-bottom:16px}
        .row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .type-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        .type-btn{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:10px;color:var(--text-secondary);cursor:pointer;font-size:12px}
        .type-btn:hover,.type-btn.active{border-color:var(--neon-purple);color:var(--neon-purple);background:rgba(168,85,247,0.1)}
        .check-label{display:flex;align-items:center;gap:10px;cursor:pointer}
        .check-label input{width:auto;margin:0}
        .mfoot{display:flex;justify-content:flex-end;gap:10px;padding-top:18px;border-top:1px solid var(--glass-border)}
        .detail-content{padding:22px}
        .detail-head{display:flex;align-items:center;gap:16px;padding-bottom:18px;border-bottom:1px solid var(--glass-border);margin-bottom:18px}
        .detail-head h3{margin:0;font-size:18px;color:var(--text-primary)}
        .detail-head p{margin:4px 0 0;color:var(--text-muted);font-size:13px}
        .detail-head .status{margin-left:auto}
        .detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .detail-grid div{padding:14px;background:var(--glass-bg);border-radius:10px}
        .detail-grid span{font-size:11px;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px}
        .detail-grid b{font-size:15px;color:var(--text-primary)}
        .spin{animation:spin 1s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:1024px){.events-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:768px){.stats{grid-template-columns:1fr 1fr}.events-grid{grid-template-columns:1fr}.row,.type-grid{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}
