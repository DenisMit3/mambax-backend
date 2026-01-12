'use client';

import { Users, DollarSign, Share2 } from 'lucide-react';

export default function ReferralsPage() {
  return (
    <div className="referrals-page">
      <h1 className="page-title">Referral Program</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="iconbox blue"><Users size={20} /></div>
          <div>
            <div className="label">Total Refers</div>
            <div className="value">1,245</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="iconbox green"><DollarSign size={20} /></div>
          <div>
            <div className="label">Rewards Paid</div>
            <div className="value">$5,200</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="iconbox purple"><Share2 size={20} /></div>
          <div>
            <div className="label">Conversion Rate</div>
            <div className="value">18.5%</div>
          </div>
        </div>
      </div>

      <div className="referral-list">
        <h3>Recent Referrals</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Referrer</th>
              <th>Referred User</th>
              <th>Date</th>
              <th>Status</th>
              <th>Reward</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>john_doe</td>
              <td>jane_smith</td>
              <td>2 mins ago</td>
              <td><span className="badge success">Converted</span></td>
              <td>1 Month Gold</td>
            </tr>
            <tr>
              <td>alex_k</td>
              <td>mike_r</td>
              <td>1 hour ago</td>
              <td><span className="badge pending">Pending</span></td>
              <td>-</td>
            </tr>
            <tr>
              <td>sarah_c</td>
              <td>emily_w</td>
              <td>3 hours ago</td>
              <td><span className="badge success">Converted</span></td>
              <td>$10 Credit</td>
            </tr>
          </tbody>
        </table>
      </div>

      <style jsx>{`
                .referrals-page { padding: 32px; color: #f1f5f9; }
                .page-title { margin-bottom: 24px; }
                .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 32px; }
                .stat-card { background: rgba(30, 41, 59, 0.5); padding: 20px; border-radius: 12px; display: flex; align-items: center; gap: 16px; border: 1px solid rgba(148, 163, 184, 0.2); }
                .iconbox { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
                .iconbox.blue { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
                .iconbox.green { background: rgba(16, 185, 129, 0.2); color: #10b981; }
                .iconbox.purple { background: rgba(168, 85, 247, 0.2); color: #a855f7; }
                .label { font-size: 12px; color: #94a3b8; }
                .value { font-size: 24px; font-weight: 700; color: white; }
                
                .referral-list { background: rgba(30, 41, 59, 0.5); padding: 24px; border-radius: 16px; border: 1px solid rgba(148, 163, 184, 0.2); }
                .table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.05); color: #cbd5e1; font-size: 14px; }
                .table th { color: #94a3b8; font-size: 12px; text-transform: uppercase; }
                .badge { padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
                .badge.success { background: rgba(16, 185, 129, 0.2); color: #10b981; }
                .badge.pending { background: rgba(249, 115, 22, 0.2); color: #f97316; }
            `}</style>
    </div>
  );
}
