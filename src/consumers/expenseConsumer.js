import { getChannel } from '../configs/rabbitmq.js';
import { processNotification } from '../eventHandler/notificationEngine.js';
import { QUEUES } from '../producers/notificationPublisher.js';

const EXPENSE_QUEUE = QUEUES.EXPENSE;

// Expense-specific consumer configuration
const EXPENSE_CONSUMER_CONFIG = {
  prefetch: 1,
  noAck: false,
  consumerTag: 'expense-consumer'
};

// Process expense notification
const processExpenseNotification = async (message) => {
  try {
    const notificationData = JSON.parse(message.content.toString());
    
    console.log(`Processing expense notification:`, {
      messageId: notificationData.messageId,
      userId: notificationData.userId,
      eventType: notificationData.eventType,
      expenseId: notificationData.payload?.expenseId,
      amount: notificationData.payload?.amount,
      status: notificationData.payload?.status
    });

    // Add expense-specific validation
    if (!notificationData.payload?.expenseId) {
      throw new Error('Expense ID is required for expense notifications');
    }

    if (!notificationData.payload?.amount) {
      throw new Error('Amount is required for expense notifications');
    }

    if (!notificationData.payload?.status) {
      throw new Error('Status is required for expense notifications');
    }

    // Process through the notification engine
    const result = await processNotification(notificationData);
    
    console.log(`Expense notification processed successfully for user ${notificationData.userId}`);
    return result;
  } catch (error) {
    console.error('Error processing expense notification:', error.message);
    throw error;
  }
};

// Start expense consumer
const startExpenseConsumer = async () => {
  try {
    const channel = getChannel();
    
    console.log(`Starting expense consumer for queue: ${EXPENSE_QUEUE}`);
    
    await channel.consume(EXPENSE_QUEUE, async (message) => {
      if (!message) {
        console.log(`No message received from ${EXPENSE_QUEUE}`);
        return;
      }

      try {
        await processExpenseNotification(message);
        channel.ack(message);
        console.log(`Expense message acknowledged: ${message.properties.messageId || 'unknown'}`);
      } catch (error) {
        console.error(`Failed to process expense message:`, error.message);
        channel.nack(message, false, true); // Reject and requeue
      }
    }, EXPENSE_CONSUMER_CONFIG);

    console.log(`Expense consumer started for queue: ${EXPENSE_QUEUE}`);
  } catch (error) {
    console.error(`Error starting expense consumer:`, error.message);
    throw error;
  }
};

// Stop expense consumer
const stopExpenseConsumer = async () => {
  try {
    const channel = getChannel();
    await channel.cancel(EXPENSE_CONSUMER_CONFIG.consumerTag);
    console.log('Expense consumer stopped');
  } catch (error) {
    console.error('Error stopping expense consumer:', error.message);
  }
};

export {
  startExpenseConsumer,
  stopExpenseConsumer,
  processExpenseNotification
}; 