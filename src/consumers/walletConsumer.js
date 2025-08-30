import { getChannel } from '../configs/rabbitmq.js';
import { processNotification } from '../eventHandler/notificationEngine.js';
import { QUEUES } from '../producers/notificationPublisher.js';

const WALLET_QUEUE = QUEUES.WALLET;

// Wallet-specific consumer configuration
const WALLET_CONSUMER_CONFIG = {
  prefetch: 1,
  noAck: false,
  consumerTag: 'wallet-consumer'
};

// Process wallet notification
const processWalletNotification = async (message) => {
  try {
    const notificationData = JSON.parse(message.content.toString());
    
    console.log(`Processing wallet notification:`, {
      messageId: notificationData.messageId,
      userId: notificationData.userId,
      eventType: notificationData.eventType,
      transactionId: notificationData.payload?.transactionId,
      amount: notificationData.payload?.amount
    });

    // Add wallet-specific validation
    if (!notificationData.payload?.transactionId) {
      throw new Error('Transaction ID is required for wallet notifications');
    }

    if (!notificationData.payload?.amount) {
      throw new Error('Amount is required for wallet notifications');
    }

    // Process through the notification engine
    const result = await processNotification(notificationData);
    
    console.log(`Wallet notification processed successfully for user ${notificationData.userId}`);
    return result;
  } catch (error) {
    console.error('Error processing wallet notification:', error.message);
    throw error;
  }
};

// Start wallet consumer
const startWalletConsumer = async () => {
  try {
    const channel = getChannel();
    
    console.log(`Starting wallet consumer for queue: ${WALLET_QUEUE}`);
    
    await channel.consume(WALLET_QUEUE, async (message) => {
      if (!message) {
        console.log(`No message received from ${WALLET_QUEUE}`);
        return;
      }

      try {
        await processWalletNotification(message);
        channel.ack(message);
        console.log(`Wallet message acknowledged: ${message.properties.messageId || 'unknown'}`);
      } catch (error) {
        console.error(`Failed to process wallet message:`, error.message);
        channel.nack(message, false, true); // Reject and requeue
      }
    }, WALLET_CONSUMER_CONFIG);

    console.log(`Wallet consumer started for queue: ${WALLET_QUEUE}`);
  } catch (error) {
    console.error(`Error starting wallet consumer:`, error.message);
    throw error;
  }
};

// Stop wallet consumer
const stopWalletConsumer = async () => {
  try {
    const channel = getChannel();
    await channel.cancel(WALLET_CONSUMER_CONFIG.consumerTag);
    console.log('Wallet consumer stopped');
  } catch (error) {
    console.error('Error stopping wallet consumer:', error.message);
  }
};

export {
  startWalletConsumer,
  stopWalletConsumer,
  processWalletNotification
}; 