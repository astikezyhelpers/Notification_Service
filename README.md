# 🔔 Notification Service – Low-Level Design (LLD)

---

## 1. Overview

The **Notification Service** is a decoupled microservice responsible for sending system notifications to users based on internal events. It ensures:

- **Multi-channel delivery** (Email, SMS, Push, In-App).
- **Event-driven and async processing** via message queues.
- **User preference management** for each channel/event type.
- **Audit trail** and delivery status tracking.
- **High availability**, **scalability**, and **retry support**.

---

## 2. Architecture Diagram

```
                        ┌──────────────────────────────┐
                        │        API Gateway           │
                        │ - JWT Auth                   │
                        │ - Rate Limiting              │
                        └────────────┬─────────────────┘
                                     │
                   ┌────────────────▼────────────────┐
                   │        Notification API         │
                   │ - Accept notification request   │
                   │ - Validate & enqueue event      │
                   └────────────────┬────────────────┘
                                    │
                          ┌─────────▼────────────┐
                          │ Notification Queue   │◄────────────┐
                          │ (Kafka / RabbitMQ)   │             │
                          └─────────┬────────────┘             │
                                    ▼                          │
                       ┌──────────────────────────┐           │
                       │    Notification Engine    │           │
                       │ - Load user preferences   │           │
                       │ - Choose channel(s)       │           │
                       │ - Format message          │           │
                       └──────────┬───────────────┘           │
                                  │                           │
        ┌─────────────────────────┼───────────────────────────┘
        ▼                         ▼                         ▼
┌──────────────┐         ┌──────────────┐          ┌────────────────┐
│ Email Worker │         │ SMS Worker   │          │ Push Worker     │
│ - SendGrid   │         │ - Twilio     │          │ - FCM/Expo      │
└──────┬───────┘         └──────┬───────┘          └──────┬──────────┘
       │                        │                          │
       ▼                        ▼                          ▼
┌──────────────┐       ┌──────────────┐           ┌──────────────────┐
│ SendGrid API │       │ Twilio API   │           │ Firebase API     │
└──────────────┘       └──────────────┘           └──────────────────┘

             ┌────────────────────────────────────────────┐
             │        Notification Log Database           │
             │ - Status: Sent, Failed, Retried            │
             │ - Delivery attempts, timestamps, metadata  │
             └────────────────────────────────────────────┘
```

---

## 3. Components Breakdown

### 3.1 Notification API
- Accepts notification requests either from internal microservices or admin tools.
- Only initiates notification creation – no actual sending.
- Pushes structured notification payloads to Kafka.

**Validations:**
- JWT authentication.
- Required fields: userId, event type, payload.
- Valid channel based on user preferences.

### 3.2 Notification Queue
- Topic-based async communication (e.g., `booking_confirmed`, `wallet_debited`).
- Each event has a corresponding consumer in Notification Engine.
- Enables decoupled triggering and load-leveling.

### 3.3 Notification Engine (Dispatcher)
- Core logic unit.
- Subscribes to events from queue.
- Fetches user’s notification preferences (from Redis → PostgreSQL fallback).
- Based on event type and preference:
  - Decides which channels to use.
  - Sends messages to respective channel workers.
- Adds a message to retry queue if any channel fails.

### 3.4 Channel Workers

Each worker is containerized and independently scalable.

#### a) Email Worker
- Integrates with SendGrid (or Amazon SES).
- Formats content using templates.
- Handles rate limits and delivery callbacks.

#### b) SMS Worker
- Integrates with Twilio, MSG91, or AWS SNS.
- Short content rendering.
- Used for OTPs or critical alerts.

#### c) Push Notification Worker
- Works with Firebase Cloud Messaging (FCM) or Expo.
- Handles device tokens, TTL, and priorities.
- Sends real-time alerts for mobile users.

#### d) In-App Notification (optional)
- Stores messages in Redis.
- Consumed via WebSockets or polling from frontend.

### 3.5 Retry & Fallback Manager
- Checks retry counts and previous delivery attempts.
- Supports:
  - Immediate retry for transient failures.
  - Exponential backoff strategy.
  - Channel fallback (e.g., Push → SMS).

---

## 4. Database Design

### PostgreSQL (Persistent Storage)

#### Table: notification_preferences

| Column     | Type     | Description                          |
|------------|----------|--------------------------------------|
| user_id    | UUID     | Foreign key to User                  |
| channel    | ENUM     | email, sms, push, in_app             |
| event_type | ENUM     | booking, wallet, expense, rewards    |
| is_enabled | BOOLEAN  | Whether this combination is enabled  |
| updated_at | TIMESTAMP| Last updated time                    |

#### Table: notification_logs

| Column          | Type     | Description                        |
|------------------|----------|------------------------------------|
| id               | UUID     | Unique log ID                      |
| user_id          | UUID     | Receiver                           |
| channel          | ENUM     | Delivery channel                   |
| status           | ENUM     | sent, failed, retrying             |
| message_id       | TEXT     | External provider ID               |
| retry_count      | INT      | Retry attempts                     |
| payload_preview  | TEXT     | Summary of content                 |
| created_at       | TIMESTAMP| Time of first attempt              |

---

## 5. Caching Layer

### Redis
- `user:{user_id}:preferences` – Cache of preferences.
- `in_app_notifications:{user_id}` – In-app unread messages.
- Used to reduce DB hits for real-time interactions.

---

## 6. APIs (Internal Use)

| Endpoint                              | Method | Description                        |
|---------------------------------------|--------|------------------------------------|
| `/notifications/send`                 | POST   | Accepts notification job           |
| `/notifications/{user_id}`           | GET    | Get user’s past notification logs  |
| `/notifications/preferences/{user_id}`| GET    | Fetch current preferences          |
| `/notifications/preferences`          | PUT    | Update preferences                 |

---

## 7. Event Triggers (Consumers)

| Source Service  | Event Name         | Notification Triggered |
|-----------------|--------------------|--------------------------|
| Booking Service | BookingConfirmed   | Booking confirmation     |
| Wallet Service  | WalletDebited      | Wallet used              |
| Expense Service | ExpenseApproved    | Expense approved         |
| Reward Service  | RewardCredited     | Cashback notification    |

---

## 8. Sequence Diagram Example

**Scenario**: Booking Confirmation Email

```
Booking Service ──(event)──> Kafka: booking_confirmed
      ↓
Notification Engine (Dispatcher)
      ↓
Check Preferences (Redis → DB fallback)
      ↓
Select Channel (Email)
      ↓
Send Message → Email Worker
      ↓
Email Worker → SendGrid API
      ↓
Response → Log to PostgreSQL
      ↓
If Failed → Retry Manager → Queue for retry
```

---

## 9. Monitoring & Logging

### Metrics (Prometheus):
- Notification success rate per channel.
- Retry frequency and reasons.
- Queue processing latency.

### Logging (ELK Stack):
- Full logs of all events and requests.
- Delivery metadata and provider responses.
- Filterable by user, channel, or status.

### Alerts (Grafana):
- Provider failure.
- Retry spike > threshold.
- Notification drop (in-flight > timeout).

---

## 10. Deployment & Scalability

- Deployed in Kubernetes cluster `ctms-production`.
- Each channel worker runs in its own pod.
- Horizontal Pod Autoscaler (HPA) enabled.
- Redis and PostgreSQL managed via Helm charts.
- Ingress routing for external admin API.
- CI/CD using GitHub Actions + Docker + Helm.

---

## 11. Security Considerations

- API secured via JWT + API Gateway.
- Role-based access: Admins can view logs; users can manage preferences.
- Rate limiting per endpoint.
- Data encrypted in-transit (TLS) and at rest.
- Logs scrubbed for sensitive content (e.g., phone/email).

---

## 12. Future Enhancements

- Template builder for custom messages.
- Multilingual support.
- Delivery receipts and read acknowledgements.
- User segmentation for targeted campaigns.
- Integration with analytics for behavior-driven messages.