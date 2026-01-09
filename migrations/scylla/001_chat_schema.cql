-- Create Keyspace
CREATE KEYSPACE IF NOT EXISTS dating 
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

USE dating;

-- Messages Table
-- Pattern: Store messages by chat_id, ordered by time.
CREATE TABLE IF NOT EXISTS messages (
    chat_id UUID,
    created_at TIMESTAMP,
    message_id UUID,
    sender_id UUID,
    content_text TEXT,
    content_media_url TEXT,
    status TEXT, -- 'sent', 'delivered', 'read'
    PRIMARY KEY ((chat_id), created_at)
) WITH CLUSTERING ORDER BY (created_at DESC);
