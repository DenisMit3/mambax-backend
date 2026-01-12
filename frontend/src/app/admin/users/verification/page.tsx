'use client';

import { useState, useEffect } from 'react';
import { adminApi, VerificationRequestItem } from '@/services/adminApi';
import { CheckCircle, XCircle, Search, RefreshCw, Loader2, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VerificationQueuePage() {
    const [queue, setQueue] = useState<VerificationRequestItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchQueue = async () => {
        setLoading(true);
        try {
            const response = await adminApi.users.getVerificationQueue();
            setQueue(response.items);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
    }, []);

    const handleReview = async (requestId: string, action: 'approve' | 'reject') => {
        try {
            await adminApi.users.reviewVerification(requestId, action);
            setQueue(prev => prev.filter(item => item.id !== requestId));
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="verification-page">
            <div className="page-header">
                <h1>Verification Queue</h1>
                <button className="btn-secondary" onClick={fetchQueue}>
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            {loading ? (
                <div className="loading-state"><Loader2 className="spin" /> Loading queue...</div>
            ) : queue.length === 0 ? (
                <div className="empty-state">No users pending verification</div>
            ) : (
                <div className="verification-grid">
                    {queue.map(item => (
                        <motion.div key={item.id} className="verify-card" layout>
                            <div className="verify-header">
                                <div className="avatar large">{item.user_name.charAt(0)}</div>
                                <div>
                                    <h3>{item.user_name}</h3>
                                    <span className={`priority-badge p-${item.priority}`}>Priority: {item.priority}</span>
                                </div>
                            </div>

                            {item.submitted_photos && item.submitted_photos.length > 0 && (
                                <div className="verification-photos">
                                    {item.submitted_photos.map((photo, i) => (
                                        <div key={i} className="photo-thumb">
                                            {/* In real app, use Image component */}
                                            <ImageIcon size={20} />
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="verify-content">
                                <div className="detail-row">
                                    <span>Submitted:</span>
                                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="detail-row">
                                    <span>AI Confidence:</span>
                                    <span>{item.ai_confidence ? `${(item.ai_confidence * 100).toFixed(1)}%` : 'N/A'}</span>
                                </div>
                            </div>
                            <div className="verify-actions">
                                <button className="btn-reject" onClick={() => handleReview(item.id, 'reject')}>
                                    <XCircle size={18} /> Reject
                                </button>
                                <button className="btn-approve" onClick={() => handleReview(item.id, 'approve')}>
                                    <CheckCircle size={18} /> Verify
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <style jsx>{`
                .verification-page { padding: 32px; }
                .page-header { display: flex; justify-content: space-between; margin-bottom: 24px; color: #f1f5f9; }
                .verification-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
                .verify-card { background: rgba(30, 41, 59, 0.5); backdrop-filter: blur(10px); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 16px; padding: 20px; }
                .verify-header { display: flex; gap: 16px; align-items: center; margin-bottom: 20px; color: white; }
                .avatar.large { width: 60px; height: 60px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; }
                .verify-content { margin-bottom: 20px; border-top: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1); padding: 12px 0; }
                .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #94a3b8; }
                .verify-actions { display: flex; gap: 12px; }
                .verify-actions button { flex: 1; padding: 10px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; }
                .btn-approve { background: rgba(16, 185, 129, 0.2); color: #10b981; }
                .btn-approve:hover { background: rgba(16, 185, 129, 0.3); }
                .btn-reject { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
                .btn-reject:hover { background: rgba(239, 68, 68, 0.3); }
                .loading-state, .empty-state { text-align: center; color: #94a3b8; padding: 40px; }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
