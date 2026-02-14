export default function UserNotesTab() {
    return (
        <div className="notes-section">
            <textarea placeholder="Add a note about this user..." />
            <button className="add-note-btn">Add Note</button>
        </div>
    );
}
