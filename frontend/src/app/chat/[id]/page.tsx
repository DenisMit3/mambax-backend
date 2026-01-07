"use client";

import { useState, useEffect, useRef } from "react";
import { authService } from "@/services/api";
import { ArrowLeft, Send, MoreVertical } from "lucide-react";
import Link from "next/link";

export default function ChatRoomPage({ params }: { params: { id: string } }) {
    const { id } = params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [currentUser, setCurrentUser] = useState<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch messages periodically
    useEffect(() => {
        // Get current user to know which messages are "mine"
        authService.getMe().then(u => setCurrentUser(u)).catch(console.error);

        const fetchMessages = () => {
            authService.getMessages(id)
                .then(data => setMessages(data))
                .catch(err => console.error("Msg error", err));
        };

        fetchMessages();
        const interval = setInterval(fetchMessages, 3000); // Polling every 3s
        return () => clearInterval(interval);
    }, [id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!inputText.trim()) return;
        try {
            await authService.sendMessage(id, inputText);
            setInputText("");
            // Optimistic update or wait for poll? Wait for now to be safe with IDs
            authService.getMessages(id).then(setMessages);
        } catch (e) {
            console.error("Send error", e);
        }
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--background)' }}>

            {/* Header */}
            <div style={{
                padding: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface)',
                zIndex: 10
            }}>
                <Link href="/chat">
                    <ArrowLeft size={24} color="white" />
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#333', overflow: 'hidden' }}>
                        {/* Ideally we fetch match details to show name/avatar here. For now generic */}
                        <img src="https://placehold.co/100x100/png" alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Match</h3>
                        <p style={{ fontSize: '12px', color: '#4CAF50' }}>Online</p>
                    </div>
                </div>
                <MoreVertical size={20} color="var(--text-secondary)" />
            </div>

            {/* Messages Area */}
            <div style={{
                flex: 1,
                padding: '15px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px'
            }}>
                {messages.map((msg) => {
                    // Check if I am sender. 
                    // Note: API returns sender_id. I need my own user_id.
                    // ProfileResponse has user_id.
                    const isMe = currentUser && msg.sender_id === currentUser.user_id;

                    return (
                        <div key={msg.id} style={{
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            maxWidth: '75%',
                            padding: '12px 16px',
                            borderRadius: '16px',
                            background: isMe ? 'var(--primary)' : 'var(--surface)',
                            color: 'white',
                            borderBottomRightRadius: isMe ? '4px' : '16px',
                            borderBottomLeftRadius: isMe ? '16px' : '4px',
                            fontSize: '15px',
                            lineHeight: '1.4'
                        }}>
                            {msg.text}
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{
                padding: '15px',
                background: 'var(--surface)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                gap: '10px',
                alignItems: 'center'
            }}>
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    style={{
                        flex: 1,
                        background: 'var(--background)',
                        border: 'none',
                        borderRadius: '24px',
                        padding: '12px 20px',
                        color: 'white',
                        outline: 'none',
                        fontSize: '15px'
                    }}
                />
                <button
                    onClick={handleSend}
                    style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none'
                    }}
                >
                    <Send size={20} color="white" />
                </button>
            </div>
        </div>
    );
}
