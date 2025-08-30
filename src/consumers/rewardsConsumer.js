import { getChannel } from '../configs/rabbitmq.js';
import { processNotification } from '../eventHandler/notificationEngine.js';
import { QUEUES } from '../producers/notificationPublisher.js';

const REWARDS_QUEUE = QUEUES.REWARDS;

// Rewards-specific consumer configuration
const REWARDS_CONSUMER_CONFIG = {
  prefetch: 1,
  noAck: false,
  consumerTag: 'rewards-consumer'
};

// Process rewards notification
const processRewardsNotification = async (message) => {
  try {
    const notificationData = JSON.parse(message.content.toString());
    
    console.log(`Processing rewards notification:`, {
      messageId: notificationData.messageId,
      userId: notificationData.userId,
      eventType: notificationData.eventType,
      rewardId: notificationData.payload?.rewardId,
      points: notificationData.payload?.points,
      source: notificationData.payload?.source
    });

    // Add rewards-specific validation
    if (!notificationData.payload?.rewardId) {
      throw new Error('Reward ID is required for rewards notifications');
    }

    if (!notificationData.payload?.points) {
      throw new Error('Points are required for rewards notifications');
    }

    if (!notificationData.payload?.source) {
      throw new Error('Source is required for rewards notifications');
    }

    // Process through the notification engine
    const result = await processNotification(notificationData);
    
    console.log(`Rewards notification processed successfully for user ${notificationData.userId}`);
    return result;
  } catch (error) {
    console.error('Error processing rewards notification:', error.message);
    throw error;
  }
};

// Start rewards consumer
const startRewardsConsumer = async () => {
  try {
    const channel = getChannel();
    
    console.log(`Starting rewards consumer for queue: ${REWARDS_QUEUE}`);
    
    await channel.consume(REWARDS_QUEUE, async (message) => {
      if (!message) {
        console.log(`No message received from ${REWARDS_QUEUE}`);
        return;
      }

      try {
        await processRewardsNotification(message);
        channel.ack(message);
        console.log(`Rewards message acknowledged: ${message.properties.messageId || 'unknown'}`);
      } catch (error) {
        console.error(`Failed to process rewards message:`, error.message);
        channel.nack(message, false, true); // Reject and requeue
      }
    }, REWARDS_CONSUMER_CONFIG);

    console.log(`Rewards consumer started for queue: ${REWARDS_QUEUE}`);
  } catch (error) {
    console.error(`Error starting rewards consumer:`, error.message);
    throw error;
  }
};

// Stop rewards consumer
const stopRewardsConsumer = async () => {
  try {
    const channel = getChannel();
    await channel.cancel(REWARDS_CONSUMER_CONFIG.consumerTag);
    console.log('Rewards consumer stopped');
  } catch (error) {
    console.error('Error stopping rewards consumer:', error.message);
  }
};

export {
  startRewardsConsumer,
  stopRewardsConsumer,
  processRewardsNotification
}; 