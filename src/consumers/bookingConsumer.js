import { getChannel } from '../configs/rabbitmq.js';
import { processNotification } from '../eventHandler/notificationEngine.js';
import { QUEUES } from '../producers/notificationPublisher.js';

const BOOKING_QUEUE = QUEUES.BOOKING;

// Booking-specific consumer configuration
const BOOKING_CONSUMER_CONFIG = {
  prefetch: 1,
  noAck: false,
  consumerTag: 'booking-consumer'
};

// Process booking notification
const processBookingNotification = async (message) => {
  try {
    const notificationData = JSON.parse(message.content.toString());
    
    console.log(`Processing booking notification:`, {
      messageId: notificationData.messageId,
      userId: notificationData.userId,
      eventType: notificationData.eventType,
      bookingId: notificationData.payload?.bookingId
    });

    // Add booking-specific validation
    if (!notificationData.payload?.bookingId) {
      throw new Error('Booking ID is required for booking notifications');
    }

    // Process through the notification engine
    const result = await processNotification(notificationData);
    
    console.log(`Booking notification processed successfully for user ${notificationData.userId}`);
    return result;
  } catch (error) {
    console.error('Error processing booking notification:', error.message);
    throw error;
  }
};

// Start booking consumer
const startBookingConsumer = async () => {
  try {
    const channel = getChannel();
    
    console.log(`Starting booking consumer for queue: ${BOOKING_QUEUE}`);
    
    await channel.consume(BOOKING_QUEUE, async (message) => {
      if (!message) {
        console.log(`No message received from ${BOOKING_QUEUE}`);
        return;
      }

      try {
        await processBookingNotification(message);
        channel.ack(message);
        console.log(`Booking message acknowledged: ${message.properties.messageId || 'unknown'}`);
      } catch (error) {
        console.error(`Failed to process booking message:`, error.message);
        channel.nack(message, false, true); // Reject and requeue
      }
    }, BOOKING_CONSUMER_CONFIG);

    console.log(`Booking consumer started for queue: ${BOOKING_QUEUE}`);
  } catch (error) {
    console.error(`Error starting booking consumer:`, error.message);
    throw error;
  }
};

// Stop booking consumer
const stopBookingConsumer = async () => {
  try {
    const channel = getChannel();
    await channel.cancel(BOOKING_CONSUMER_CONFIG.consumerTag);
    console.log('Booking consumer stopped');
  } catch (error) {
    console.error('Error stopping booking consumer:', error.message);
  }
};

export {
  startBookingConsumer,
  stopBookingConsumer,
  processBookingNotification
}; 