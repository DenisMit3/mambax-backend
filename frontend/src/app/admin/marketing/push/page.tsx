'use client';

import { useState } from 'react';
import { Send, Bell, Users, Clock } from 'lucide-react';

export default function PushNotificationsPage() {
    const [sending, setSending] = useState(false);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        setTimeout(() => setSending(false), 2000);
    };

    return (
        <div className="push-page">
            <h1 className="page-title">Send Push Notification</h1>

            <div className="content-grid">
                <form className="push-form" onSubmit={handleSend}>
                    <div className="form-group">
                        <label>Target Audience</label>
                        <select className="input">
                            <option>All Users</option>
                            <option>Premium Subscribers</option>
                            <option>Inactive (30 days)</option>
                            <option>New Users</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Title</label>
                        <input className="input" type="text" placeholder="e.g., Special Offer Just for You!" required />
                    </div>

                    <div className="form-group">
                        <label>Message Body</label>
                        <textarea className="input area" placeholder="Enter notification content..." required></textarea>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="btn-send" disabled={sending}>
                            {sending ? 'Sending...' : <><Send size={16} /> Send Notification</>}
                        </button>
                    </div>
                </form>

                <div className="preview-panel">
                    <h3>Preview</h3>
                    <div className="phone-mockup">
                        <div className="notification-card">
                            <div className="notif-header">
                                <span className="app-name">MambaX</span>
                                <span className="time">now</span>
                            </div>
                            <div className="notif-title">Special Offer Just for You!</div>
                            <div className="notif-body">Enter notification content...</div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .push-page { padding: 32px; color: #f1f5f9; }
                .content-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 32px; max-width: 1000px; }
                .push-form { background: rgba(30, 41, 59, 0.5); padding: 24px; border-radius: 16px; border: 1px solid rgba(148, 163, 184, 0.2); }
                .form-group { margin-bottom: 20px; }
                .form-group label { display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500; color: #cbd5e1; }
                .input { width: 100%; padding: 12px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 8px; color: white; outline: none; transition: border-color 0.2s; }
                .input:focus { border-color: #3b82f6; }
                .area { height: 120px; resize: vertical; }
                .btn-send { width: 100%; background: #3b82f6; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.2s; }
                .btn-send:hover { background: #2563eb; }
                .btn-send:disabled { background: #64748b; cursor: not-allowed; }
                
                .preview-panel h3 { margin-top: 0; margin-bottom: 16px; }
                .phone-mockup { background: #0f172a; border-radius: 20px; padding: 16px; height: 400px; border: 4px solid #334155; position: relative; }
                .notification-card { background: rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 12px; backdrop-filter: blur(10px); }
                .notif-header { display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; margin-bottom: 4px; }
                .notif-title { font-weight: 600; font-size: 13px; margin-bottom: 2px; }
                .notif-body { font-size: 12px; color: #cbd5e1; }
            `}</style>
        </div>
    );
}
