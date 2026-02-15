'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { advancedApi, Event } from '@/services/advancedApi';
import { Clock, Video, Coffee, Gamepad2, BookOpen, Calendar } from 'lucide-react';

export type EventStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';

export interface EventStats {
    total_events?: number;
    active_events?: number;
    total_participants?: number;
    [key: string]: unknown;
}

export const eventTypes = [
    { id: 'speed-dating', name: 'Speed Dating', icon: Clock },
    { id: 'video-mixer', name: 'Video Mixer', icon: Video },
    { id: 'game-night', name: 'Game Night', icon: Gamepad2 },
    { id: 'coffee-chat', name: 'Coffee Chat', icon: Coffee },
    { id: 'book-club', name: 'Book Club', icon: BookOpen }
];

export function useEventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [stats, setStats] = useState<EventStats | null>(null);
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
                name: formData.name, event_type: formData.event_type,
                start_date: new Date(formData.start_date).toISOString(),
                max_participants: formData.max_participants, is_premium: formData.is_premium
            });
            closeModal(); loadData();
        } catch (e) { setFormErrors({ submit: 'Failed to create event' }); }
        finally { setSubmitting(false); }
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEvent || !validate()) return;
        setSubmitting(true);
        try {
            await advancedApi.updateEvent(editingEvent.id, {
                name: formData.name, event_type: formData.event_type,
                start_date: new Date(formData.start_date).toISOString(),
                max_participants: formData.max_participants, is_premium: formData.is_premium
            });
            closeModal(); loadData();
        } catch (e) { setFormErrors({ submit: 'Failed to update event' }); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (ev: Event) => {
        if (!confirm(`Delete "${ev.name}"? This action cannot be undone.`)) return;
        setDeletingId(ev.id);
        try { await advancedApi.deleteEvent(ev.id); loadData(); }
        catch (e) { console.error('Failed to delete event', e); }
        finally { setDeletingId(null); }
    };

    const openEditModal = (ev: Event) => {
        const localDate = ev.start_date ? new Date(ev.start_date).toISOString().slice(0, 16) : '';
        setFormData({
            name: ev.name, event_type: ev.type, start_date: localDate,
            max_participants: ev.max_participants, is_premium: ev.is_premium
        });
        setEditingEvent(ev); setFormErrors({}); setShowModal(true);
    };

    const openCreateModal = () => {
        setFormData({ name: '', event_type: 'speed-dating', start_date: '', max_participants: 50, is_premium: false });
        setEditingEvent(null); setFormErrors({}); setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false); setEditingEvent(null);
        setFormData({ name: '', event_type: 'speed-dating', start_date: '', max_participants: 50, is_premium: false });
        setFormErrors({});
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled': return 'blue'; case 'live': return 'green';
            case 'completed': return 'gray'; case 'cancelled': return 'red'; default: return 'gray';
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

    return {
        events, stats, loading, showModal, filterStatus, setFilterStatus,
        searchQuery, setSearchQuery, formData, setFormData, formErrors,
        submitting, selectedEvent, setSelectedEvent, editingEvent,
        deletingId, filtered, loadData,
        handleCreate, handleEdit, handleDelete,
        openEditModal, openCreateModal, closeModal,
        getStatusColor, formatDate, getEventIcon
    };
}
