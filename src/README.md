# 🔔 Notification Service Implementation

This directory contains the complete implementation of the notification service as specified in the main README.md.

## 📁 Directory Structure

```
src/
├── api/                    # API Layer
│   ├── controller/         # Request handlers
│   └── router/            # Route definitions
├── channels/              # Channel Workers
│   ├── email.js          # Email (SendGrid)
│   ├── sms.js            # SMS (Twilio)
│   └── push.js           # Push (Firebase)
├── configs/               # Service Configurations
│   ├── db.js             # Database (Prisma)
│   ├── redis.js          # Redis Cache
│   ├── rabbitmq.js       # RabbitMQ Connection
│   └── initialize.js     # Service Initialization
├── consumers/             # Queue Consumers
│   ├── notificationConsumer.js  # Main consumer
│   ├── bookingConsumer.js       # Booking-specific consumer
│   ├── walletConsumer.js        # Wallet-specific consumer
│   ├── expenseConsumer.js       # Expense-specific consumer
│   └── rewardsConsumer.js       # Rewards-specific consumer
├── eventHandler/          # Notification Engine
│   └── notificationEngine.js
├── preferences/           # User Preference Management
│   └── preferences.js
├── producers/             # RabbitMQ Publishers
│   └── notificationPublisher.js
├── utils/                 # Utilities
│   └── logger.js
├── test/                  # Test Files
│   └── testSystem.js
└── server.js              # Main Server
```

## 🚀 Features Implemented

### ✅ **1. Complete API Layer**
- **4 Required Endpoints** as per README:
  - `POST /api/notifications/send` - Send notification
  - `GET /api/notifications/{user_id}` - Get user logs
  - `GET /api/notifications/preferences/{user_id}` - Get preferences
  - `PUT /api/notifications/preferences` - Update preferences
- **Bonus Endpoints**:
  - `GET /api/notifications/queue/stats` - Queue statistics
  - `POST /api/notifications/consumers/start` - Start consumers
  - `POST /api/notifications/consumers/stop` - Stop consumers
  - `GET /api/notifications/consumers/status` - Consumer status
- **Health Check**: `GET /health` - Service health

### ✅ **2. RabbitMQ Publisher with 4 Queue Types**
- **Booking Queue**: `booking_notifications`
- **Wallet Queue**: `wallet_notifications`
- **Expense Queue**: `expense_notifications`
- **Rewards Queue**: `rewards_notifications`
- **Event Mapping**: Automatic routing based on event type
- **Persistent Messages**: Survive broker restarts
- **Queue Statistics**: Monitor queue health

### ✅ **3. Queue Consumers (NEW!)**
- **Main Consumer**: `notificationConsumer.js` - Processes all queues
- **Specialized Consumers**: 
  - `bookingConsumer.js` - Booking-specific validation
  - `walletConsumer.js` - Wallet-specific validation
  - `expenseConsumer.js` - Expense-specific validation
  - `rewardsConsumer.js` - Rewards-specific validation
- **Message Acknowledgment**: Proper ACK/NACK handling
- **Error Handling**: Automatic requeuing on failures
- **Consumer Management**: Start/stop/status endpoints

### ✅ **4. Notification Engine (Dispatcher)**
- **User Preference Management**: Redis caching with DB fallback
- **Multi-Channel Routing**: Email, SMS, Push based on preferences
- **Message Templates**: Dynamic content generation per event type
- **Error Handling**: Comprehensive error tracking
- **Delivery Logging**: Audit trail for all notifications

### ✅ **5. Channel Workers**
- **Email Worker**: SendGrid integration (production-ready)
- **SMS Worker**: Twilio integration (mock for development)
- **Push Worker**: Firebase Cloud Messaging (mock for development)
- **Development Mode**: Mock implementations for testing

### ✅ **6. Preference Management**
- **Redis Caching**: 1-hour TTL for performance
- **Database Fallback**: PostgreSQL for persistence
- **Event-Specific Preferences**: Per-channel, per-event settings
- **Cache Invalidation**: Automatic cache clearing on updates

## 🔧 Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/notifications
DIRECT_URL=postgresql://user:pass@localhost:5432/notifications

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# Email (SendGrid)
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM=noreply@yourcompany.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# Push (Firebase)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY=your_private_key

# Server
PORT=3000
NODE_ENV=development
```

## 🧪 Testing

### Run Complete System Test
```bash
node src/test/testSystem.js
```

### Test Individual Components
```bash
# Test API endpoints
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "eventType": "booking_confirmed",
    "payload": {
      "bookingId": "booking_456",
      "hotelName": "Grand Hotel",
      "amount": 299.99,
      "email": "user@example.com"
    }
  }'

# Get queue statistics
curl http://localhost:3000/api/notifications/queue/stats

# Get consumer status
curl http://localhost:3000/api/notifications/consumers/status

# Get user preferences
curl http://localhost:3000/api/notifications/preferences/user_123
```

## 📊 API Examples

### 1. Send Notification
```bash
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "eventType": "wallet_debited",
    "payload": {
      "transactionId": "txn_789",
      "amount": 150.00,
      "balance": 850.00,
      "description": "Hotel booking payment",
      "email": "user@example.com",
      "phone": "+1234567890"
    },
    "channels": ["email", "sms"]
  }'
```

### 2. Update User Preferences
```bash
curl -X PUT http://localhost:3000/api/notifications/preferences \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "preferences": [
      {
        "channel": "email",
        "eventType": "booking",
        "isEnabled": true
      },
      {
        "channel": "sms",
        "eventType": "booking",
        "isEnabled": false
      },
      {
        "channel": "push",
        "eventType": "wallet",
        "isEnabled": true
      }
    ]
  }'
```

### 3. Consumer Management
```bash
# Start all consumers
curl -X POST http://localhost:3000/api/notifications/consumers/start

# Stop all consumers
curl -X POST http://localhost:3000/api/notifications/consumers/stop

# Get consumer status
curl http://localhost:3000/api/notifications/consumers/status
```

## 🎯 Event Types Supported

| Event Type | Queue | Consumer | Description |
|------------|-------|----------|-------------|
| `booking_confirmed` | booking_notifications | bookingConsumer.js | Hotel booking confirmed |
| `booking_cancelled` | booking_notifications | bookingConsumer.js | Hotel booking cancelled |
| `booking_updated` | booking_notifications | bookingConsumer.js | Hotel booking updated |
| `wallet_debited` | wallet_notifications | walletConsumer.js | Money debited from wallet |
| `wallet_credited` | wallet_notifications | walletConsumer.js | Money credited to wallet |
| `wallet_transfer` | wallet_notifications | walletConsumer.js | Money transferred |
| `expense_approved` | expense_notifications | expenseConsumer.js | Expense approved |
| `expense_rejected` | expense_notifications | expenseConsumer.js | Expense rejected |
| `expense_submitted` | expense_notifications | expenseConsumer.js | Expense submitted |
| `rewards_credited` | rewards_notifications | rewardsConsumer.js | Points earned |
| `rewards_expired` | rewards_notifications | rewardsConsumer.js | Points expired |
| `rewards_used` | rewards_notifications | rewardsConsumer.js | Points used |

## 🔄 Complete Message Flow

```
1. API Request → POST /api/notifications/send
2. Publisher → RabbitMQ Queue (based on event type)
3. Consumer → Process message from queue
4. Notification Engine → Check user preferences
5. Channel Workers → Send via Email/SMS/Push
6. Database → Log delivery status
```

## 🔄 Next Steps

1. **Add Retry Mechanism**: Handle failed deliveries with exponential backoff
2. **Implement Dead Letter Queue**: Handle permanently failed messages
3. **Add Monitoring**: Prometheus metrics and Grafana dashboards
4. **Production Deploy**: Kubernetes deployment with Helm charts
5. **Add Authentication**: JWT authentication and rate limiting

## 🚨 Production Considerations

- **Security**: Add JWT authentication and rate limiting
- **Monitoring**: Implement comprehensive logging and metrics
- **Scalability**: Add horizontal pod autoscaling
- **Reliability**: Implement circuit breakers and fallback mechanisms
- **Compliance**: Add data encryption and audit trails 