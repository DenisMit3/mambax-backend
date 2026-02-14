'use client';

interface StarsModalProps {
    starsAction: 'add' | 'remove';
    starsAmount: number;
    starsReason: string;
    onActionChange: (action: 'add' | 'remove') => void;
    onAmountChange: (amount: number) => void;
    onReasonChange: (reason: string) => void;
    onSubmit: () => void;
    onClose: () => void;
}

export default function StarsModal({
    starsAction, starsAmount, starsReason,
    onActionChange, onAmountChange, onReasonChange,
    onSubmit, onClose,
}: StarsModalProps) {
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3 className="text-white" style={{ marginBottom: '20px' }}>Manage User Stars</h3>

                <div className="form-group">
                    <label>Действие</label>
                    <select
                        value={starsAction}
                        onChange={(e) => onActionChange(e.target.value as 'add' | 'remove')}
                    >
                        <option value="add">Add Stars</option>
                        <option value="remove">Remove Stars</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Сумма</label>
                    <input
                        type="number"
                        value={starsAmount}
                        onChange={(e) => onAmountChange(Number(e.target.value))}
                        min="1"
                    />
                </div>

                <div className="form-group">
                    <label>Reason</label>
                    <input
                        type="text"
                        value={starsReason}
                        onChange={(e) => onReasonChange(e.target.value)}
                        placeholder="e.g. Bonus, Refund, Adjustment"
                    />
                </div>

                <div className="modal-actions">
                    <button
                        onClick={onClose}
                        className="text-slate-400 border-slate-600"
                        style={{
                            padding: '10px 16px',
                            background: 'transparent',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSubmit}
                        className="text-white"
                        style={{
                            padding: '10px 16px',
                            background: starsAction === 'add' ? '#10b981' : '#ef4444',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        {starsAction === 'add' ? 'Add Stars' : 'Remove Stars'}
                    </button>
                </div>
            </div>
        </div>
    );
}
