export const eventsPageStyles = `
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
    .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:100;padding:20px}
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
`;
