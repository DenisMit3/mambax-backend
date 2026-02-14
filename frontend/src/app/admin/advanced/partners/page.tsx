'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Home, ChevronRight, Plus, Sparkles, Search,
  Users, DollarSign, Globe, Building2, Trash2, Edit2, Eye, X,
  ArrowUpDown, Loader2, RefreshCw, CheckCircle, Clock, XCircle, Percent
} from 'lucide-react';
import { advancedApi, Partner } from '@/services/advancedApi';

interface PartnerStats {
  total_partners?: number;
  active_partners?: number;
  total_revenue?: number;
  [key: string]: unknown;
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortField, setSortField] = useState<'users_count' | 'revenue_share'>('users_count');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [formData, setFormData] = useState({ name: '', domain: '', revenue_share_percentage: 15 });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await advancedApi.getPartners();
      setPartners(res.partners);
      setStats(res.stats);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    let data = [...partners];
    if (searchQuery) data = data.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.domain?.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterStatus !== 'all') data = data.filter(p => p.status === filterStatus);
    data.sort((a, b) => {
      const av = a[sortField], bv = b[sortField];
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return data;
  }, [partners, searchQuery, filterStatus, sortField, sortDir]);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Partner name is required';
    if (formData.revenue_share_percentage < 0 || formData.revenue_share_percentage > 100) errors.revenue_share_percentage = 'Must be 0-100';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (editingPartner) {
        await advancedApi.updatePartner(editingPartner.id, formData);
      } else {
        await advancedApi.createPartner(formData);
      }
      closeModal();
      loadData();
    } catch (e) { setFormErrors({ submit: editingPartner ? 'Failed to update partner' : 'Failed to create partner' }); }
    finally { setSubmitting(false); }
  };

  const openEdit = (p: Partner) => {
    setEditingPartner(p);
    setFormData({ name: p.name, domain: p.domain || '', revenue_share_percentage: p.revenue_share });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPartner(null);
    setFormData({ name: '', domain: '', revenue_share_percentage: 15 });
    setFormErrors({});
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this partner?')) return;
    setDeletingId(id);
    try {
      await advancedApi.deletePartner(id);
      loadData();
    } catch (e) { console.error('Failed to delete partner', e); }
    finally { setDeletingId(null); }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle size={14} />;
      case 'pending': return <Clock size={14} />;
      case 'inactive': return <XCircle size={14} />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'pending': return 'orange';
      case 'inactive': return 'red';
      default: return 'gray';
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="page">
      <nav className="bc"><Link href="/admin"><Home size={14} /></Link><ChevronRight size={14} /><Link href="/admin/advanced"><Sparkles size={14} /></Link><ChevronRight size={14} /><span><Briefcase size={14} />Partners</span></nav>

      <div className="header">
        <div><h1>White-Label Partners</h1><p>Manage partner integrations and revenue sharing</p></div>
        <button className="btn pri" onClick={() => { setEditingPartner(null); setFormData({ name: '', domain: '', revenue_share_percentage: 15 }); setFormErrors({}); setShowModal(true); }}><Plus size={18} />Добавить партнёра</button>
      </div>

      {stats && (
        <div className="stats">
          <div className="stat"><Building2 size={20} /><div><span>Партнёры</span><b>{stats.total_partners}</b></div></div>
          <div className="stat"><Users size={20} /><div><span>Пользователи</span><b>{stats.total_users.toLocaleString()}</b></div></div>
          <div className="stat"><DollarSign size={20} /><div><span>Доход</span><b>{formatCurrency(stats.total_revenue)}</b></div></div>
          <div className="stat"><Clock size={20} /><div><span>Ожидание</span><b>{stats.pending_invites}</b></div></div>
        </div>
      )}

      <div className="filters">
        <div className="search"><Search size={18} /><input placeholder="Поиск партнёров..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
        </select>
        <button onClick={loadData}><RefreshCw size={16} className={loading ? 'spin' : ''} /></button>
      </div>

      {loading ? <div className="loading"><Loader2 className="spin" size={32} /></div> : (
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Партнёр</th>
              <th>Домен</th>
              <th>Статус</th>
              <th onClick={() => { setSortField('users_count'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>Пользователи <ArrowUpDown size={12} /></th>
              <th onClick={() => { setSortField('revenue_share'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>Rev Share <ArrowUpDown size={12} /></th>
              <th>Joined</th>
              <th>Действия</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={7} className="empty">No partners found</td></tr> : filtered.map((p) => (
                <tr key={p.id}>
                  <td className="partner-cell">
                    <div className="partner-logo">{p.logo ? <img src={p.logo} alt={p.name || 'Логотип партнёра'} /> : <Building2 size={20} />}</div>
                    <span className="partner-name">{p.name}</span>
                  </td>
                  <td className="domain">{p.domain ? <a href={`https://${p.domain}`} target="_blank" rel="noopener"><Globe size={14} />{p.domain}</a> : '-'}</td>
                  <td><span className={`status ${getStatusColor(p.status)}`}>{getStatusIcon(p.status)}{p.status}</span></td>
                  <td className="num">{p.users_count.toLocaleString()}</td>
                  <td><span className="rev-share">{p.revenue_share}%</span></td>
                  <td className="date">{new Date(p.joined_at).toLocaleDateString()}</td>
                  <td><div className="acts">
                    <button onClick={() => setSelectedPartner(p)}><Eye size={14} /></button>
                    <button onClick={() => openEdit(p)}><Edit2 size={14} /></button>
                    <button className="del" disabled={deletingId === p.id} onClick={() => handleDelete(p.id)}>{deletingId === p.id ? <Loader2 className="spin" size={14} /> : <Trash2 size={14} />}</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal}>
            <motion.div className="modal" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
              <div className="mhead"><h2>{editingPartner ? 'Edit Partner' : 'Add Partner'}</h2><button onClick={closeModal}><X size={20} /></button></div>
              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label>Partner Name *</label>
                  <input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Название компании" />
                  {formErrors.name && <span className="err">{formErrors.name}</span>}
                </div>
                <div className="field">
                  <label>Domain</label>
                  <div className="domain-input"><span>https://</span><input value={formData.domain} onChange={e => setFormData(p => ({ ...p, domain: e.target.value }))} placeholder="partner-domain.com" /></div>
                </div>
                <div className="field">
                  <label>Revenue Share (%)</label>
                  <div className="range-wrap">
                    <input type="range" min={0} max={50} value={formData.revenue_share_percentage} onChange={e => setFormData(p => ({ ...p, revenue_share_percentage: Number(e.target.value) }))} />
                    <span className="range-val">{formData.revenue_share_percentage}%</span>
                  </div>
                  {formErrors.revenue_share_percentage && <span className="err">{formErrors.revenue_share_percentage}</span>}
                </div>
                <div className="info-box"><Percent size={16} />Revenue share determines the percentage of subscription revenue paid to the partner for users acquired through their platform.</div>
                {formErrors.submit && <div className="ferr">{formErrors.submit}</div>}
                <div className="mfoot">
                  <button type="button" className="btn sec" onClick={closeModal}>Отмена</button>
                  <button type="submit" className="btn pri" disabled={submitting}>{submitting ? <Loader2 className="spin" size={16} /> : editingPartner ? <Edit2 size={16} /> : <Plus size={16} />}{editingPartner ? 'Сохранить' : 'Добавить партнёра'}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Modal */}
      <AnimatePresence>
        {selectedPartner && (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedPartner(null)}>
            <motion.div className="modal" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
              <div className="mhead"><h2>Partner Details</h2><button onClick={() => setSelectedPartner(null)}><X size={20} /></button></div>
              <div className="detail-content">
                <div className="detail-head">
                  <div className="partner-logo lg">{selectedPartner.logo ? <img src={selectedPartner.logo} alt={selectedPartner.name || 'Логотип партнёра'} /> : <Building2 size={32} />}</div>
                  <div>
                    <h3>{selectedPartner.name}</h3>
                    {selectedPartner.domain && <a href={`https://${selectedPartner.domain}`} target="_blank" rel="noopener"><Globe size={14} />{selectedPartner.domain}</a>}
                  </div>
                  <span className={`status ${getStatusColor(selectedPartner.status)}`}>{getStatusIcon(selectedPartner.status)}{selectedPartner.status}</span>
                </div>
                <div className="detail-grid">
                  <div><span>Пользователи</span><b>{selectedPartner.users_count.toLocaleString()}</b></div>
                  <div><span>Revenue Share</span><b>{selectedPartner.revenue_share}%</b></div>
                  <div><span>Joined</span><b>{new Date(selectedPartner.joined_at).toLocaleDateString()}</b></div>
                  <div><span>Статус</span><b className="cap">{selectedPartner.status}</b></div>
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
        .table-wrap{background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:16px;overflow-x:auto}
        table{width:100%;border-collapse:collapse;min-width:800px}
        th{text-align:left;padding:14px 18px;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;background:var(--glass-bg-light);border-bottom:1px solid var(--glass-border);cursor:pointer}
        th:hover{color:var(--text-primary)}
        td{padding:14px 18px;border-bottom:1px solid var(--glass-border);color:var(--text-primary);font-size:14px}
        tr:hover{background:var(--glass-bg-light)}
        .partner-cell{display:flex;align-items:center;gap:12px}
        .partner-logo{width:40px;height:40px;background:var(--glass-bg-light);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);overflow:hidden}
        .partner-logo.lg{width:56px;height:56px}
        .partner-logo img{width:100%;height:100%;object-fit:cover}
        .partner-name{font-weight:600}
        .domain a{display:flex;align-items:center;gap:6px;color:var(--neon-blue);text-decoration:none}
        .domain a:hover{text-decoration:underline}
        .status{display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;text-transform:capitalize}
        .status.green{background:rgba(16,185,129,0.2);color:var(--neon-green)}
        .status.orange{background:rgba(249,115,22,0.2);color:var(--neon-orange)}
        .status.red{background:rgba(239,68,68,0.2);color:var(--neon-red)}
        .num{font-weight:600;text-align:center}
        .rev-share{padding:4px 10px;background:rgba(168,85,247,0.2);border-radius:20px;font-size:12px;font-weight:700;color:var(--neon-purple)}
        .date{color:var(--text-muted)}
        .acts{display:flex;gap:6px}
        .acts button{padding:7px;background:var(--glass-bg-light);border:1px solid var(--glass-border);border-radius:6px;color:var(--text-secondary);cursor:pointer}
        .acts button:hover{color:var(--text-primary)}
        .acts .del:hover{color:var(--neon-red)}
        .acts button:disabled{opacity:0.5;cursor:not-allowed}
        .empty{text-align:center;padding:40px;color:var(--text-muted)}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:100;padding:20px}
        .modal{background:var(--admin-bg-secondary);border:1px solid var(--glass-border);border-radius:18px;width:100%;max-width:500px}
        .mhead{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:1px solid var(--glass-border)}
        .mhead h2{font-size:17px;color:var(--text-primary);margin:0}
        .mhead button{padding:6px;background:none;border:none;color:var(--text-muted);cursor:pointer}
        form{padding:22px}
        .field{margin-bottom:18px}
        .field label{display:block;font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:6px}
        .field input{width:100%;padding:11px 14px;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:10px;color:var(--text-primary);outline:none}
        .field input:focus{border-color:var(--neon-purple)}
        .err{color:var(--neon-red);font-size:12px;margin-top:4px;display:block}
        .ferr{padding:10px;background:rgba(239,68,68,0.1);border-radius:8px;color:var(--neon-red);font-size:13px;margin-bottom:16px}
        .domain-input{display:flex;align-items:center;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:10px;overflow:hidden}
        .domain-input span{padding:11px 14px;background:var(--glass-bg-light);color:var(--text-muted);border-right:1px solid var(--glass-border);font-size:14px}
        .domain-input input{border:none;border-radius:0}
        .range-wrap{display:flex;align-items:center;gap:16px}
        .range-wrap input[type="range"]{flex:1;height:6px;-webkit-appearance:none;background:var(--glass-bg-light);border-radius:3px}
        .range-wrap input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;background:var(--neon-purple);border-radius:50%;cursor:pointer}
        .range-val{font-size:18px;font-weight:700;color:var(--neon-purple);min-width:50px}
        .info-box{display:flex;align-items:flex-start;gap:10px;padding:14px;background:rgba(59,130,246,0.1);border-radius:10px;font-size:13px;color:var(--text-secondary);margin-bottom:18px}
        .mfoot{display:flex;justify-content:flex-end;gap:10px;padding-top:18px;border-top:1px solid var(--glass-border)}
        .detail-content{padding:22px}
        .detail-head{display:flex;align-items:center;gap:16px;padding-bottom:18px;border-bottom:1px solid var(--glass-border);margin-bottom:18px}
        .detail-head h3{margin:0;font-size:18px;color:var(--text-primary)}
        .detail-head a{display:flex;align-items:center;gap:6px;color:var(--neon-blue);text-decoration:none;font-size:13px;margin-top:4px}
        .detail-head .status{margin-left:auto}
        .detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .detail-grid div{padding:14px;background:var(--glass-bg);border-radius:10px}
        .detail-grid span{font-size:11px;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px}
        .detail-grid b{font-size:15px;color:var(--text-primary)}
        .cap{text-transform:capitalize}
        .spin{animation:spin 1s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:768px){.stats{grid-template-columns:1fr 1fr}}
      `}</style>
    </div>
  );
}
