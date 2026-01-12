from prometheus_client import Counter, Gauge

# Metrics
ACTIVE_USERS_GAUGE = Gauge("active_users", "Number of currently connected active users")
MATCHES_COUNTER = Counter("matches_total", "Total number of matches formed")
MESSAGES_COUNTER = Counter("messages_total", "Total number of messages sent")
