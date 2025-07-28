import { getUserPreferencesForEvent } from '../preferences/preferences.js';
import { sendEmail } from '../channels/email.js';
import { sendSMS } from '../channels/sms.js';
import { sendPush } from '../channels/push.js';
import { logNotification } from '../utils/logger.js';

// Message templates for different event types
const MESSAGE_TEMPLATES = {
  booking: {
    email: {
      subject: 'Booking Confirmation',
      body: (data) => `
        <h2>Booking Confirmation</h2>
        <p>Your booking has been confirmed!</p>
        <p><strong>Booking ID:</strong> ${data.bookingId}</p>
        <p><strong>Hotel:</strong> ${data.hotelName}</p>
        <p><strong>Check-in:</strong> ${data.checkIn}</p>
        <p><strong>Check-out:</strong> ${data.checkOut}</p>
        <p><strong>Amount:</strong> $${data.amount}</p>
      `
    },
    sms: (data) => `Booking confirmed! ID: ${data.bookingId}, Hotel: ${data.hotelName}, Amount: $${data.amount}`,
    push: {
      title: 'Booking Confirmed',
      body: (data) => `Your booking at ${data.hotelName} has been confirmed`
    }
  },
  wallet: {
    email: {
      subject: 'Wallet Transaction',
      body: (data) => `
        <h2>Wallet Transaction</h2>
        <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
        <p><strong>Amount:</strong> $${data.amount}</p>
        <p><strong>Balance:</strong> $${data.balance}</p>
        <p><strong>Description:</strong> ${data.description}</p>
      `
    },
    sms: (data) => `Wallet: ${data.description} - $${data.amount}. Balance: $${data.balance}`,
    push: {
      title: 'Wallet Transaction',
      body: (data) => `${data.description}: $${data.amount}`
    }
  },
  expense: {
    email: {
      subject: 'Expense Update',
      body: (data) => `
        <h2>Expense ${data.status}</h2>
        <p><strong>Expense ID:</strong> ${data.expenseId}</p>
        <p><strong>Amount:</strong> $${data.amount}</p>
        <p><strong>Category:</strong> ${data.category}</p>
        <p><strong>Description:</strong> ${data.description}</p>
        <p><strong>Status:</strong> ${data.status}</p>
      `
    },
    sms: (data) => `Expense ${data.status}: $${data.amount} - ${data.description}`,
    push: {
      title: 'Expense Update',
      body: (data) => `Your expense of $${data.amount} has been ${data.status}`
    }
  },
  rewards: {
    email: {
      subject: 'Rewards Update',
      body: (data) => `
        <h2>Rewards Update</h2>
        <p><strong>Reward ID:</strong> ${data.rewardId}</p>
        <p><strong>Points:</strong> ${data.points}</p>
        <p><strong>Total Points:</strong> ${data.totalPoints}</p>
        <p><strong>Source:</strong> ${data.source}</p>
      `
    },
    sms: (data) => `Rewards: +${data.points} points from ${data.source}. Total: ${data.totalPoints}`,
    push: {
      title: 'Rewards Update',
      body: (data) => `You earned ${data.points} points from ${data.source}`
    }
  }
};

// Process notification based on event type and user preferences
export async function processNotification(notificationData) {
  const { userId, eventType, payload, messageId } = notificationData;
  
  try {
    console.log(` Processing notification for user ${userId}, event: ${eventType}`);
    
    // Get user preferences for this event
    const preferences = await getUserPreferencesForEvent(userId, eventType);
    
    // Get message template for this event type
    const template = MESSAGE_TEMPLATES[eventType] || MESSAGE_TEMPLATES.booking;
    
    // Track delivery attempts
    const deliveryResults = [];
    
    // Send to enabled channels
    if (preferences.email && payload.email) {
      try {
        const emailResult = await sendEmail(
          payload.email,
          template.email.subject,
          template.email.body(payload)
        );
        deliveryResults.push({
          channel: 'email',
          status: 'sent',
          messageId: emailResult.messageId
        });
        console.log(` Email sent to ${payload.email}`);
      } catch (error) {
        deliveryResults.push({
          channel: 'email',
          status: 'failed',
          error: error.message
        });
        console.error(` Email failed for ${payload.email}:`, error.message);
      }
    }
    
    if (preferences.sms && payload.phone) {
      try {
        const smsResult = await sendSMS(
          payload.phone,
          template.sms(payload)
        );
        deliveryResults.push({
          channel: 'sms',
          status: 'sent',
          messageId: smsResult.messageId
        });
        console.log(` SMS sent to ${payload.phone}`);
      } catch (error) {
        deliveryResults.push({
          channel: 'sms',
          status: 'failed',
          error: error.message
        });
        console.error(` SMS failed for ${payload.phone}:`, error.message);
      }
    }
    
    if (preferences.push && payload.deviceToken) {
      try {
        const pushResult = await sendPush(
          payload.deviceToken,
          template.push.title,
          template.push.body(payload)
        );
        deliveryResults.push({
          channel: 'push',
          status: 'sent',
          messageId: pushResult.messageId
        });
        console.log(` Push notification sent to device ${payload.deviceToken}`);
      } catch (error) {
        deliveryResults.push({
          channel: 'push',
          status: 'failed',
          error: error.message
        });
        console.error(` Push notification failed for device ${payload.deviceToken}:`, error.message);
      }
    }
    
    // Log all delivery attempts
    for (const result of deliveryResults) {
      await logNotification({
        userId,
        channel: result.channel,
        status: result.status,
        messageId: result.messageId || messageId,
        payloadPreview: JSON.stringify(payload).substring(0, 200),
        error: result.error
      });
    }
    
    console.log(` Notification processing completed for user ${userId}`);
    return {
      success: true,
      deliveryResults,
      messageId
    };
    
  } catch (error) {
    console.error(` Error processing notification for user ${userId}:`, error.message);
    
    // Log the error
    await logNotification({
      userId,
      channel: 'system',
      status: 'failed',
      messageId,
      payloadPreview: JSON.stringify(payload).substring(0, 200),
      error: error.message
    });
    
    throw error;
  }
}

// Generate message content based on event type
export function generateMessage(eventType, payload) {
  const template = MESSAGE_TEMPLATES[eventType] || MESSAGE_TEMPLATES.booking;
  
  return {
    email: {
      subject: template.email.subject,
      body: template.email.body(payload)
    },
    sms: template.sms(payload),
    push: {
      title: template.push.title,
      body: template.push.body(payload)
    }
  };
} 