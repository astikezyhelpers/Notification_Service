import { getChannel } from '../configs/rabbitmq.js';
import { processNotification } from '../eventHandler/notificationEngine.js';
import { QUEUES } from '../producers/notificationPublisher.js';

// Consumer configuration
const CONSUMER_CONFIG = {
  prefetch: 1, // Process one message at a time
  noAck: false, // Require acknowledgment
  consumerTag: 'notification-consumer'
};

// Process message from queue
const processMessage = async (message, queueName) => {
  try {
    const notificationData = JSON.parse(message.content.toString());
    console.log(`Processing message from ${queueName}:`, {
      messageId: notificationData.messageId,
      userId: notificationData.userId,
      eventType: notificationData.eventType
    });

    // Process the notification through the engine
    const result = await processNotification(notificationData);
    
    console.log(`Successfully processed notification for user ${notificationData.userId}`);
    return result;
  } catch (error) {
    console.error(`Error processing message from ${queueName}:`, error.message);
    throw error;
  }
};

// Handle message acknowledgment
const handleAck = (channel, message, success) => {
  if (success) {
    channel.ack(message);
    console.log(`Message acknowledged: ${message.properties.messageId || 'unknown'}`);
  } else {
    channel.nack(message, false, true); // Reject and requeue
    console.log(`Message rejected and requeued: ${message.properties.messageId || 'unknown'}`);
  }
};

// Start consuming from a specific queue
const startConsuming = async (queueName) => {
  try {
    const channel = getChannel();
    
    console.log(`Starting consumer for queue: ${queueName}`);
    
    await channel.consume(queueName, async (message) => {
      if (!message) {
        console.log(`No message received from ${queueName}`);
        return;
      }

      try {
        await processMessage(message, queueName);
        handleAck(channel, message, true);
      } catch (error) {
        console.error(`Failed to process message from ${queueName}:`, error.message);
        handleAck(channel, message, false);
      }
    }, CONSUMER_CONFIG);

    console.log(`Consumer started for queue: ${queueName}`);
  } catch (error) {
    console.error(`Error starting consumer for ${queueName}:`, error.message);
    throw error;
  }
};

// Start all consumers
const startAllConsumers = async () => {
  try {
    console.log('Starting all notification consumers...');
    
    // Start consumers for all queues
    const consumerPromises = Object.values(QUEUES).map(queueName => 
      startConsuming(queueName)
    );
    
    await Promise.all(consumerPromises);
    
    console.log('All notification consumers started successfully');
  } catch (error) {
    console.error('Error starting consumers:', error.message);
    throw error;
  }
};

// Stop all consumers
const stopAllConsumers = async () => {
  try {
    const channel = getChannel();
    
    // Cancel all consumers
    for (const queueName of Object.values(QUEUES)) {
      try {
        await channel.cancel(CONSUMER_CONFIG.consumerTag);
        console.log(`Consumer stopped for queue: ${queueName}`);
      } catch (error) {
        console.log(`Consumer already stopped for queue: ${queueName}`);
      }
    }
    
    console.log('All consumers stopped');
  } catch (error) {
    console.error('Error stopping consumers:', error.message);
  }
};

// Get consumer status
const getConsumerStatus = async () => {
  try {
    const channel = getChannel();
    const status = {};
    
    for (const [queueType, queueName] of Object.entries(QUEUES)) {
      const queueInfo = await channel.checkQueue(queueName);
      status[queueType] = {
        queueName,
        messageCount: queueInfo.messageCount,
        consumerCount: queueInfo.consumerCount,
        status: queueInfo.consumerCount > 0 ? 'active' : 'inactive'
      };
    }
    
    return status;
  } catch (error) {
    console.error('Error getting consumer status:', error.message);
    return {};
  }
};

export {
  startAllConsumers,
  stopAllConsumers,
  startConsuming,
  getConsumerStatus,
  processMessage
}; 