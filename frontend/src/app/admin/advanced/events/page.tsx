'use client';

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Home, ChevronRight, Plus, Sparkles, Search,
    Users, Clock, Star, Crown, Trash2, Edit2, Eye, X, Loader2, RefreshCw
} from 'lucide-react';
import { useEventsPage, eventTypes } from './useEventsPage';
import { eventsPageStyles } from './eventsPageStyles';

export default function EventsPage() {
    const {
        stats, loading, showModal, filterStatus, setFilterStatus,
        searchQuery, setSearchQuery, formData, setFormData, formErrors,
        submitting, selectedEvent, setSelectedEvent, editingEvent,
        deletingId, filtered, loadData,
        handleCreate, handleEdit, handleDelete,
        openEditModal, openCreateModal, closeModal,
        getStatusColor, formatDate, getEventIcon
    } = useEventsPage();

    return (
        <div className="page">
            <nav className="bc"><Link href="/admin"><Home size={14} /></Link><ChevronRight size={14} /><Link href="/admin/advanced"><Sparkles size={14} /></Link><ChevronRight size={14} /><span><Calendar size={14} />События</span></nav>

            <div className="header">
                <div><h1>Virtual Dating Events</h1><p>Create and manage online dating experiences</p></div>
                <button className="btn pri" onClick={openCreateModal}><Plus size={18} />Создать событие</button>
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
                <div className="search"><Search size={18} /><input placeholder="Поиск событий..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="live">Live</option>
                    <option value="completed">Завершено</option>
                    <option value="cancelled">Cancelled</option>
                </select>
                <button onClick={loadData}><RefreshCw size={16} className={loading ? 'spin' : ''} /></button>
            </div>

            {loading ? <div className="loading"><Loader2 className="spin" size={32} /></div> : (
                <div className="events-grid">
                    {filtered.length === 0 ? (
                        <div className="empty"><Calendar size={48} /><p>No events found</p><button className="btn pri" onClick={openCreateModal}><Plus size={16} />Создать событие</button></div>
                    ) : filtered.map((ev, i) => (
                        <motion.div key={ev.id} className="event-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <div className="card-head">
                                <div className="type-icon">{getEventIcon(ev.type)}</div>
                                <span className={`status ${getStatusColor(ev.status)}`}>{ev.status}</span>
                                {ev.is_premium && <span className="premium"><Crown size={12} />Премиум</span>}
                            </div>
                            <h3>{ev.name}</h3>
                            <p className="type">{eventTypes.find(t => t.id === ev.type)?.name || ev.type}</p>
                            <div className="meta">
                                <div><Clock size={14} />{formatDate(ev.start_date)}</div>
                                <div><Users size={14} />{ev.registered}/{ev.max_participants}</div>
                            </div>
                            <div className="progress"><div style={{ width: `${(ev.registered / ev.max_participants) * 100}%` }} /></div>
                            <p className="host">Организатор: {ev.host || 'TBD'}</p>
                            <div className="card-actions">
                                <button onClick={() => setSelectedEvent(ev)}><Eye size={14} />Просмотр</button>
                                <button onClick={() => openEditModal(ev)}><Edit2 size={14} />Редактировать</button>
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
                            <div className="mhead"><h2>{editingEvent ? 'Edit Event' : 'Создать событие'}</h2><button onClick={closeModal}><X size={20} /></button></div>
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
                                            <button type="button" key={t.id} className={`type-btn ${formData.event_type === t.id ? 'active' : ''}`}
                                                onClick={() => setFormData(p => ({ ...p, event_type: t.id }))}>
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
                                    <button type="button" className="btn sec" onClick={closeModal}>Отмена</button>
                                    <button type="submit" className="btn pri" disabled={submitting}>
                                        {submitting ? <Loader2 className="spin" size={16} /> : editingEvent ? <Edit2 size={16} /> : <Plus size={16} />}
                                        {editingEvent ? 'Сохранить' : 'Создать событие'}
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
                                    <div><h3>{selectedEvent.name}</h3><p>{eventTypes.find(t => t.id === selectedEvent.type)?.name}</p></div>
                                    <span className={`status ${getStatusColor(selectedEvent.status)}`}>{selectedEvent.status}</span>
                                </div>
                                <div className="detail-grid">
                                    <div><span>Start</span><b>{formatDate(selectedEvent.start_date)}</b></div>
                                    <div><span>Registered</span><b>{selectedEvent.registered}/{selectedEvent.max_participants}</b></div>
                                    <div><span>Организатор</span><b>{selectedEvent.host || 'Не назначен'}</b></div>
                                    <div><span>Тип</span><b>{selectedEvent.is_premium ? 'Премиум' : 'Бесплатный'}</b></div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx>{eventsPageStyles}</style>
        </div>
    );
}
