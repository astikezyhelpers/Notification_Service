import { getChannel } from '../configs/rabbitmq.js';

// Queue names as per README architecture
const QUEUES = {
  BOOKING: 'booking_notifications',
  WALLET: 'wallet_notifications',
  EXPENSE: 'expense_notifications',
  REWARDS: 'rewards_notifications'
};

// Event type to queue mapping
const EVENT_QUEUE_MAPPING = {
  // Booking events
  booking: 'BOOKING',
  booking_confirmed: 'BOOKING',
  booking_cancelled: 'BOOKING',
  booking_updated: 'BOOKING',
  
  // Wallet events
  wallet: 'WALLET',
  wallet_debited: 'WALLET',
  wallet_credited: 'WALLET',
  wallet_transfer: 'WALLET',
  
  // Expense events
  expense: 'EXPENSE',
  expense_approved: 'EXPENSE',
  expense_rejected: 'EXPENSE',
  expense_submitted: 'EXPENSE',
  
  // Rewards events
  rewards: 'REWARDS',
  rewards_credited: 'REWARDS',
  rewards_expired: 'REWARDS',
  rewards_used: 'REWARDS'
};

// Initialize queues
const initializeQueues = async () => {
  try {
    const channel = getChannel();
    
    // Assert all queues exist with durable=true for persistence
    for (const [queueType, queueName] of Object.entries(QUEUES)) {
      await channel.assertQueue(queueName, { 
        durable: true,
        arguments: {
          'x-message-ttl': 86400000, // 24 hours TTL
          'x-max-length': 10000 // Max 10k messages per queue
        }
      });
    }
    
    console.log('All notification queues initialized successfully');
  } catch (error) {
    console.error(' Error initializing queues:', error.message);
    throw error;
  }
};

// Publish notification to specific queue
const publishNotification = async (queueType, notificationData) => {
  try {
    const queueName = QUEUES[queueType.toUpperCase()];
    
    if (!queueName) {
      throw new Error(`Invalid queue type: ${queueType}. Valid types: ${Object.keys(QUEUES).join(', ')}`);
    }

    const channel = getChannel();

    // Add metadata to notification
    const message = {
      ...notificationData,
      timestamp: new Date().toISOString(),
      queueType: queueType,
      messageId: generateMessageId(),
      version: '1.0'
    };

    // Publish to queue with persistent delivery
    const success = channel.sendToQueue(
      queueName,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true, // Message survives broker restart
        contentType: 'application/json',
        headers: {
          'x-event-type': notificationData.eventType,
          'x-user-id': notificationData.userId
        }
      }
    );

    if (success) {
      console.log(`Notification published to ${queueName}:`, {
        messageId: message.messageId,
        userId: notificationData.userId,
        eventType: notificationData.eventType
      });
      return message.messageId;
    } else {
      throw new Error(`Failed to publish to queue: ${queueName}`);
    }
  } catch (error) {
    console.error(`Error publishing to ${queueType} queue:`, error.message);
    throw error;
  }
};

// Specific publisher functions for each queue type
const publishBookingNotification = async (notificationData) => {
  return await publishNotification('BOOKING', notificationData);
};

const publishWalletNotification = async (notificationData) => {
  return await publishNotification('WALLET', notificationData);
};

const publishExpenseNotification = async (notificationData) => {
  return await publishNotification('EXPENSE', notificationData);
};

const publishRewardsNotification = async (notificationData) => {
  return await publishNotification('REWARDS', notificationData);
};

// Generic publisher that determines queue based on event type
const publishNotificationByEventType = async (notificationData) => {
  const { eventType } = notificationData;
  
  const queueType = EVENT_QUEUE_MAPPING[eventType.toLowerCase()];
  
  if (!queueType) {
    throw new Error(`Unknown event type: ${eventType}. Valid types: ${Object.keys(EVENT_QUEUE_MAPPING).join(', ')}`);
  }
  
  return await publishNotification(queueType, notificationData);
};

// Utility function to generate unique message ID
const generateMessageId = () => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get queue statistics
const getQueueStats = async () => {
  try {
    const channel = getChannel();
    const stats = {};
    
    for (const [queueType, queueName] of Object.entries(QUEUES)) {
      const queueInfo = await channel.checkQueue(queueName);
      stats[queueType] = {
        queueName,
        messageCount: queueInfo.messageCount,
        consumerCount: queueInfo.consumerCount,
        status: 'active'
      };
    }
    
    return stats;
  } catch (error) {
    console.error(' Error getting queue stats:', error.message);
    throw error;
  }
};

// Initialize queues when module loads
let isInitialized = false;
const ensureInitialized = async () => {
  if (!isInitialized) {
    await initializeQueues();
    isInitialized = true;
  }
};

// Auto-initialize
ensureInitialized().catch(console.error);

export {
  publishBookingNotification,
  publishWalletNotification,
  publishExpenseNotification,
  publishRewardsNotification,
  publishNotificationByEventType,
  publishNotification,
  getQueueStats,
  QUEUES,
  EVENT_QUEUE_MAPPING,
  ensureInitialized
}; 