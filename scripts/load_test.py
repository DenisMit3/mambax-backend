import random
import uuid
import time
from locust import HttpUser, task, between

class MambaUser(HttpUser):
    # Simulating a user with wait time between tasks.
    # For higher RPS, decrease wait_time or increase number of users.
    wait_time = between(1, 5)
    
    def on_start(self):
        """
        Executed when a simulated user starts.
        We register a new user to get a fresh token.
        """
        self.email = f"loadtest_{uuid.uuid4()}@example.com"
        self.password = "password123"
        self.name = f"User_{random.randint(1, 10000)}"
        
        # Register to get token
        # Using /auth/register endpoint
        payload = {
            "email": self.email,
            "password": self.password,
            "name": self.name,
            "age": random.randint(18, 50),
            "gender": random.choice(["male", "female", "other"]),
            "interests": ["coding", "testing"],
            "bio": "Load testing user"
        }
        
        with self.client.post("/auth/register", json=payload, catch_response=True) as response:
            if response.status_code == 201:
                data = response.json()
                self.token = data.get("access_token")
                if self.token:
                    self.headers = {"Authorization": f"Bearer {self.token}"}
                else:
                    response.failure("No access token in response")
                    self.interrupt()
            else:
                response.failure(f"Registration failed: {response.text}")
                self.token = None
                self.interrupt() # Stop this user

        self.feed_cache = []

    @task(10)
    def get_feed_task(self):
        """
        Simulate fetching the feed. High priority.
        """
        if not hasattr(self, 'token') or not self.token:
            return
        
        with self.client.get("/feed?limit=20", headers=self.headers, catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                items = data.get("items", [])
                # Cache user IDs for swiping
                for item in items:
                    self.feed_cache.append(item.get("id"))
            elif response.status_code == 401:
                response.failure("Unauthorized - Feed")
            else:
                response.failure(f"Feed failed: {response.status_code}")
    
    @task(5)
    def swipe_task(self):
        """
        Simulate swiping (like/dislike).
        Requires feed items.
        """
        if not hasattr(self, 'token') or not self.token:
            return
            
        # Refill cache if empty
        if not self.feed_cache:
            self.get_feed_task()
            if not self.feed_cache:
                return

        target_user_id = self.feed_cache.pop() # Take one user to swipe
        action = random.choice(["like", "dislike", "superlike"])
        
        # /swipe expects SwipeCreate: {to_user_id, action}
        payload = {
            "to_user_id": target_user_id,
            "action": action
        }
        
        with self.client.post("/swipe", json=payload, headers=self.headers, catch_response=True) as response:
            # 400 is acceptable if "Already swiped"
            if response.status_code == 200:
                pass
            elif response.status_code == 400 and "Already swiped" in response.text:
                pass 
            else:
                response.failure(f"Swipe failed: {response.status_code} - {response.text}")

    @task(1)
    def send_message_task(self):
        """
        Simulate sending a message.
        Requires a match.
        """
        if not hasattr(self, 'token') or not self.token:
            return
        
        # 1. Get matches
        with self.client.get("/matches", headers=self.headers, catch_response=True) as response:
            if response.status_code != 200:
                response.failure(f"Get matches failed: {response.status_code}")
                return
            
            matches = response.json()
        
        if not matches:
            # No matches implies we can't chat.
            # This is expected behavior for new users unless they got matched.
            return
            
        # 2. Pick a random match
        match = random.choice(matches)
        match_id = match.get("id")
        
        if not match_id:
            return

        # 3. Send message
        payload = {
            "match_id": match_id,
            "text": f"Locust message {uuid.uuid4()}",
            "type": "text"
        }
        
        with self.client.post("/chat/send", json=payload, headers=self.headers, catch_response=True) as response:
            if response.status_code != 200:
                response.failure(f"Send message failed: {response.status_code} - {response.text}")
