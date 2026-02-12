'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare, Home, ChevronRight, Plus, Sparkles, Search, Filter,
    TrendingUp, BarChart3, Tag, Trash2, Edit2, Copy, Check, X, Zap,
    ArrowUpDown, ChevronDown, Loader2, RefreshCw
} from 'lucide-react';
import { advancedApi } from '@/services/advancedApi';

interface Icebreaker {
    id: string;
    text: string;
    category: string;
    tags: string[];
    usage_count: number;
    success_count: number;
    success_rate: number;
    is_active: boolean;
    created_at: string;
}

type SortField = 'text' | 'category' | 'usage_count' | 'success_rate';

export default function IcebreakersPage() {
    const [icebreakers, setIcebreakers] = useState<Icebreaker[]>([]);
    const [categories, setCategories] = useState<string[]>(['general', 'fun', 'deep']);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showAIModal, setShowAIModal] = useState(false);
    const [formData, setFormData] = useState({ text: '', category: 'general', tags: '' });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [sortField, setSortField] = useState<SortField>('usage_count');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [aiCategory, setAiCategory] = useState('general');
    const [aiGenerating, setAiGenerating] = useState(false);
    const [generated, setGenerated] = useState<string[]>([]);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await advancedApi.getIcebreakers();
            setIcebreakers(res.icebreakers as Icebreaker[]);
            setCategories(res.categories);
            setStats(res.stats);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const filtered = useMemo(() => {
        let data = [...icebreakers];
        if (searchQuery) data = data.filter(i => i.text.toLowerCase().includes(searchQuery.toLowerCase()));
        if (filterCategory !== 'all') data = data.filter(i => i.category === filterCategory);
        data.sort((a, b) => {
            const av = a[sortField], bv = b[sortField];
            return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
        });
        return data;
    }, [icebreakers, searchQuery, filterCategory, sortField, sortDir]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.text.trim()) { setFormErrors({ text: 'Required' }); return; }
        setSubmitting(true);
        try {
            await advancedApi.createIcebreaker({
                text: formData.text,
                category: formData.category,
                tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
            });
            closeModal();
            loadData();
        } catch (e) { setFormErrors({ submit: 'Failed to create' }); }
        finally { setSubmitting(false); }
    };

    const handleAIGenerate = async () => {
        setAiGenerating(true);
        try {
            const res = await advancedApi.generateIcebreakers(aiCategory, 5);
            setGenerated(res.generated || []);
        } catch (e) { console.error(e); }
        finally { setAiGenerating(false); }
    };

    const saveGenerated = async (text: string) => {
        await advancedApi.createIcebreaker({ text, category: aiCategory, tags: ['ai-generated'] });
        setGenerated(prev => prev.filter(t => t !== text));
        loadData();
    };

    const openEdit = (ib: Icebreaker) => {
        setEditingId(ib.id);
        setFormData({ text: ib.text, category: ib.category, tags: ib.tags.join(', ') });
        setFormErrors({});
        setShowModal(true);
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.text.trim()) { setFormErrors({ text: 'Required' }); return; }
        if (!editingId) return;
        setSubmitting(true);
        try {
            await advancedApi.updateIcebreaker(editingId, {
                text: formData.text,
                category: formData.category,
                tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
            });
            closeModal();
            loadData();
        } catch (e) { setFormErrors({ submit: 'Failed to update' }); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            await advancedApi.deleteIcebreaker(id);
            setShowDeleteConfirm(null);
            loadData();
        } catch (e) { console.error(e); }
        finally { setDeletingId(null); }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingId(null);
        setFormData({ text: '', category: 'general', tags: '' });
        setFormErrors({});
    };

    const copy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="page">
            <nav className="bc"><Link href="/admin"><Home size={14} /></Link><ChevronRight size={14} /><Link href="/admin/advanced"><Sparkles size={14} /></Link><ChevronRight size={14} /><span><MessageSquare size={14} />Icebreakers</span></nav>

            <div className="header">
                <div><h1>Icebreaker Templates</h1><p>Manage conversation starters</p></div>
                <div className="actions">
                    <button className="btn sec" onClick={() => setShowAIModal(true)}><Zap size={18} />AI Generate</button>
                    <button className="btn pri" onClick={() => { setEditingId(null); setFormData({ text: '', category: 'general', tags: '' }); setFormErrors({}); setShowModal(true); }}><Plus size={18} />Add New</button>
                </div>
            </div>

            {stats && (
                <div className="stats">
                    <div className="stat"><MessageSquare size={20} /><div><span>Total</span><b>{icebreakers.length}</b></div></div>
                    <div className="stat"><TrendingUp size={20} /><div><span>Uses</span><b>{stats.total_uses}</b></div></div>
                    <div className="stat"><BarChart3 size={20} /><div><span>Success</span><b>{(stats.avg_success_rate * 100).toFixed(1)}%</b></div></div>
                    <div className="stat"><Tag size={20} /><div><span>Popular</span><b>{stats.most_popular}</b></div></div>
                </div>
            )}

            <div className="filters">
                <div className="search"><Search size={18} /><input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                    <option value="all">All Categories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={loadData}><RefreshCw size={16} className={loading ? 'spin' : ''} /></button>
            </div>

            {loading ? <div className="loading"><Loader2 className="spin" size={32} /></div> : (
                <div className="table-wrap">
                    <table>
                        <thead><tr>
                            <th onClick={() => { setSortField('text'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>Text <ArrowUpDown size={12} /></th>
                            <th>Category</th>
                            <th>Tags</th>
                            <th onClick={() => { setSortField('usage_count'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>Uses <ArrowUpDown size={12} /></th>
                            <th onClick={() => { setSortField('success_rate'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>Success <ArrowUpDown size={12} /></th>
                            <th>Actions</th>
                        </tr></thead>
                        <tbody>
                            {filtered.length === 0 ? <tr><td colSpan={6} className="empty">No icebreakers found</td></tr> : filtered.map(ib => (
                                <tr key={ib.id}>
                                    <td className="txt">{ib.text}</td>
                                    <td><span className={`cat ${ib.category}`}>{ib.category}</span></td>
                                    <td><div className="tags">{ib.tags.slice(0, 2).map(t => <span key={t}>{t}</span>)}</div></td>
                                    <td className="num">{ib.usage_count}</td>
                                    <td><div className="rate"><div style={{ width: `${ib.success_rate}%` }} />{ib.success_rate}%</div></td>
                                    <td><div className="acts">
                                        <button onClick={() => copy(ib.text, ib.id)}>{copiedId === ib.id ? <Check size={14} /> : <Copy size={14} />}</button>
                                        <button onClick={() => openEdit(ib)} disabled={editingId === ib.id}>{editingId === ib.id ? <Loader2 className="spin" size={14} /> : <Edit2 size={14} />}</button>
                                        <button className="del" onClick={() => setShowDeleteConfirm(ib.id)} disabled={deletingId === ib.id}>{deletingId === ib.id ? <Loader2 className="spin" size={14} /> : <Trash2 size={14} />}</button>
                                    </div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <AnimatePresence>
                {showModal && (
                    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal}>
                        <motion.div className="modal" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
                            <div className="mhead"><h2>{editingId ? 'Edit Icebreaker' : 'Create Icebreaker'}</h2><button onClick={closeModal}><X size={20} /></button></div>
                            <form onSubmit={editingId ? handleEdit : handleCreate}>
                                <div className="field">
                                    <label>Text *</label>
                                    <textarea value={formData.text} onChange={e => setFormData(p => ({ ...p, text: e.target.value }))} rows={3} />
                                    {formErrors.text && <span className="err">{formErrors.text}</span>}
                                </div>
                                <div className="row">
                                    <div className="field"><label>Category</label><select value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                    <div className="field"><label>Tags</label><input value={formData.tags} onChange={e => setFormData(p => ({ ...p, tags: e.target.value }))} placeholder="comma,separated" /></div>
                                </div>
                                {formErrors.submit && <div className="ferr">{formErrors.submit}</div>}
                                <div className="mfoot"><button type="button" className="btn sec" onClick={closeModal}>Cancel</button><button type="submit" className="btn pri" disabled={submitting}>{submitting ? <Loader2 className="spin" size={16} /> : editingId ? <Edit2 size={16} /> : <Plus size={16} />}{editingId ? 'Save' : 'Create'}</button></div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showAIModal && (
                    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAIModal(false)}>
                        <motion.div className="modal lg" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
                            <div className="mhead"><h2><Zap size={18} />AI Generator</h2><button onClick={() => setShowAIModal(false)}><X size={20} /></button></div>
                            <div className="ai-ctrl">
                                <select value={aiCategory} onChange={e => setAiCategory(e.target.value)}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                                <button className="btn pri" onClick={handleAIGenerate} disabled={aiGenerating}>{aiGenerating ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}Generate</button>
                            </div>
                            <div className="gen-list">
                                {generated.length === 0 ? <div className="gen-empty">Click generate to create AI icebreakers</div> : generated.map((t, i) => (
                                    <div key={i} className="gen-item"><p>{t}</p><div><button onClick={() => copy(t, `g${i}`)}>{copiedId === `g${i}` ? <Check size={14} /> : <Copy size={14} />}</button><button className="btn pri sm" onClick={() => saveGenerated(t)}><Plus size={14} />Save</button></div></div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showDeleteConfirm && (
                    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteConfirm(null)}>
                        <motion.div className="modal confirm" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
                            <div className="mhead"><h2><Trash2 size={18} />Delete Icebreaker</h2><button onClick={() => setShowDeleteConfirm(null)}><X size={20} /></button></div>
                            <div className="confirm-body"><p>Are you sure you want to delete this icebreaker? This action cannot be undone.</p></div>
                            <div className="mfoot" style={{ padding: '14px 22px' }}>
                                <button className="btn sec" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
                                <button className="btn danger" onClick={() => handleDelete(showDeleteConfirm)} disabled={deletingId === showDeleteConfirm}>
                                    {deletingId === showDeleteConfirm ? <Loader2 className="spin" size={16} /> : <Trash2 size={16} />}Delete
                                </button>
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
        .actions{display:flex;gap:12px}
        .btn{display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;border:none;transition:all 0.2s}
        .btn.pri{background:var(--gradient-primary);color:#fff}
        .btn.pri:hover{box-shadow:var(--glow-purple)}
        .btn.pri:disabled{opacity:0.6}
        .btn.sec{background:var(--glass-bg-light);border:1px solid var(--glass-border);color:var(--text-primary)}
        .btn.sec:hover{border-color:var(--neon-blue)}
        .btn.sm{padding:6px 10px;font-size:12px}
        .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
        .stat{display:flex;align-items:center;gap:14px;padding:18px;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:14px}
        .stat svg{color:var(--neon-purple)}
        .stat span{font-size:11px;color:var(--text-muted);text-transform:uppercase}
        .stat b{font-size:22px;color:var(--text-primary)}
        .filters{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap}
        .search{display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--glass-bg-light);border:1px solid var(--glass-border);border-radius:10px;flex:1;min-width:200px}
        .search input{background:none;border:none;outline:none;color:var(--text-primary);width:100%}
        .search svg{color:var(--text-muted)}
        .filters select,.filters button{padding:10px 14px;background:var(--glass-bg-light);border:1px solid var(--glass-border);border-radius:10px;color:var(--text-secondary);cursor:pointer}
        .loading{display:flex;justify-content:center;padding:60px}
        .table-wrap{background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:16px;overflow-x:auto}
        table{width:100%;border-collapse:collapse;min-width:700px}
        th{text-align:left;padding:14px 18px;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;background:var(--glass-bg-light);border-bottom:1px solid var(--glass-border);cursor:pointer}
        th:hover{color:var(--text-primary)}
        td{padding:14px 18px;border-bottom:1px solid var(--glass-border);color:var(--text-primary);font-size:14px}
        tr:hover{background:var(--glass-bg-light)}
        .txt{max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .cat{padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;text-transform:capitalize}
        .cat.general{background:rgba(59,130,246,0.2);color:var(--neon-blue)}
        .cat.fun{background:rgba(236,72,153,0.2);color:var(--neon-pink)}
        .cat.deep{background:rgba(168,85,247,0.2);color:var(--neon-purple)}
        .tags{display:flex;gap:4px}
        .tags span{padding:2px 6px;background:var(--glass-bg-light);border-radius:4px;font-size:11px;color:var(--text-muted)}
        .num{text-align:center;font-weight:600}
        .rate{display:flex;align-items:center;gap:8px}
        .rate div{height:6px;background:var(--neon-green);border-radius:3px}
        .acts{display:flex;gap:6px}
        .acts button{padding:7px;background:var(--glass-bg-light);border:1px solid var(--glass-border);border-radius:6px;color:var(--text-secondary);cursor:pointer}
        .acts button:hover{color:var(--text-primary)}
        .acts .del:hover{color:var(--neon-red)}
        .empty{text-align:center;padding:40px;color:var(--text-muted)}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px}
        .modal{background:var(--admin-bg-secondary);border:1px solid var(--glass-border);border-radius:18px;width:100%;max-width:480px}
        .modal.lg{max-width:640px}
        .mhead{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:1px solid var(--glass-border)}
        .mhead h2{display:flex;align-items:center;gap:8px;font-size:17px;color:var(--text-primary);margin:0}
        .mhead button{padding:6px;background:none;border:none;color:var(--text-muted);cursor:pointer}
        form{padding:22px}
        .field{margin-bottom:18px}
        .field label{display:block;font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:6px}
        .field input,.field textarea,.field select{width:100%;padding:11px 14px;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:10px;color:var(--text-primary);outline:none}
        .field input:focus,.field textarea:focus{border-color:var(--neon-purple)}
        .err{color:var(--neon-red);font-size:12px}
        .ferr{padding:10px;background:rgba(239,68,68,0.1);border-radius:8px;color:var(--neon-red);font-size:13px;margin-bottom:16px}
        .row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .mfoot{display:flex;justify-content:flex-end;gap:10px;padding-top:18px;border-top:1px solid var(--glass-border)}
        .ai-ctrl{display:flex;gap:12px;padding:18px 22px;border-bottom:1px solid var(--glass-border)}
        .ai-ctrl select{flex:1;padding:10px 14px;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:10px;color:var(--text-primary)}
        .gen-list{padding:18px 22px;max-height:350px;overflow-y:auto}
        .gen-empty{text-align:center;padding:40px;color:var(--text-muted)}
        .gen-item{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:14px;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:12px;margin-bottom:10px}
        .gen-item p{margin:0;flex:1;font-size:14px;color:var(--text-primary)}
        .gen-item div{display:flex;gap:8px}
        .gen-item button{padding:6px;background:var(--glass-bg-light);border:1px solid var(--glass-border);border-radius:6px;color:var(--text-secondary);cursor:pointer}
        .spin{animation:spin 1s linear infinite}
        .btn.danger{background:rgba(239,68,68,0.9);color:#fff}
        .btn.danger:hover{background:rgba(239,68,68,1);box-shadow:0 0 20px rgba(239,68,68,0.3)}
        .btn.danger:disabled{opacity:0.6}
        .modal.confirm{max-width:400px}
        .confirm-body{padding:22px;color:var(--text-secondary);font-size:14px;line-height:1.6}
        .confirm-body p{margin:0}
        .acts button:disabled{opacity:0.5;cursor:not-allowed}
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:768px){.stats{grid-template-columns:1fr 1fr}.header{flex-direction:column;align-items:flex-start}.row{grid-template-columns:1fr}}
      `}</style>
        </div>
    );
}
