import { publishNotificationByEventType, getQueueStats } from '../../producers/notificationPublisher.js';
import { getUserPreferences as getPrefs, updateUserPreferences as updatePrefs } from '../../preferences/preferences.js';
import { startAllConsumers, stopAllConsumers, getConsumerStatus } from '../../consumers/notificationConsumer.js';
import prisma from '../../configs/db.js';

// POST /notifications/send - Accepts notification job
export const sendNotification = async (req, res) => {
  const { userId, eventType, payload, channels } = req.body;
  
  // Validation
  if (!userId || !eventType || !payload) {
    return res.status(400).json({
      status: 'error',
      error: 'Missing required fields',
      message: 'userId, eventType, and payload are required'
    });
  }

  // Validate event type
  const validEventTypes = ['booking', 'wallet', 'expense', 'rewards'];
  if (!validEventTypes.includes(eventType)) {
    return res.status(400).json({
      status: 'error',
      error: 'Invalid event type',
      message: `Event type must be one of: ${validEventTypes.join(', ')}`
    });
  }

  try {
    // Publish to RabbitMQ queue
    const messageId = await publishNotificationByEventType({
      userId,
      eventType,
      payload,
      channels: channels || ['email'] // Default to email if no channels specified
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Notification queued successfully',
      data: {
        messageId,
        userId,
        eventType,
        channels: channels || ['email'],
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Notification queue failed:', err.message);
    res.status(500).json({
      status: 'error',
      error: 'Notification queue failed',
      message: err.message
    });
  }
};

// GET /notifications/{user_id} - Get user's past notification logs
export const getUserNotificationLogs = async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10, status, channel } = req.query;
  
  try {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build where clause
    const where = { userId };
    if (status && ['sent', 'failed', 'retrying'].includes(status)) {
      where.status = status;
    }
    if (channel && ['email', 'sms', 'push'].includes(channel)) {
      where.channel = channel;
    }
    
    const logs = await prisma.notificationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
      select: {
        id: true,
        channel: true,
        status: true,
        messageId: true,
        retryCount: true,
        payloadPreview: true,
        createdAt: true
      }
    });
    
    const total = await prisma.notificationLog.count({ where });
    
    res.status(200).json({
      status: 'success',
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (err) {
    console.error('Failed to fetch notification logs:', err.message);
    res.status(500).json({
      status: 'error',
      error: 'Failed to fetch notification logs',
      message: err.message
    });
  }
};

// GET /notifications/preferences/{user_id} - Fetch current preferences
export const getUserPreferences = async (req, res) => {
  const { userId } = req.params;
  
  try {
    const preferences = await getPrefs(userId);
    
    res.status(200).json({
      status: 'success',
      data: {
        userId,
        preferences
      }
    });
  } catch (err) {
    console.error('Failed to fetch user preferences:', err.message);
    res.status(500).json({
      status: 'error',
      error: 'Failed to fetch user preferences',
      message: err.message
    });
  }
};

// PUT /notifications/preferences - Update preferences
export const updateUserPreferences = async (req, res) => {
  const { userId, preferences } = req.body;
  
  // Validation
  if (!userId || !preferences) {
    return res.status(400).json({
      status: 'error',
      error: 'Missing required fields',
      message: 'userId and preferences are required'
    });
  }
  
  if (!Array.isArray(preferences)) {
    return res.status(400).json({
      status: 'error',
      error: 'Invalid preferences format',
      message: 'Preferences must be an array'
    });
  }
  
  try {
    const updatedPreferences = await updatePrefs(userId, preferences);
    
    res.status(200).json({
      status: 'success',
      message: 'Preferences updated successfully',
      data: {
        userId,
        preferences: updatedPreferences
      }
    });
  } catch (err) {
    console.error('Failed to update preferences:', err.message);
    res.status(500).json({
      status: 'error',
      error: 'Failed to update preferences',
      message: err.message
    });
  }
};

// GET /notifications/queue/stats - Get RabbitMQ queue statistics
export const getQueueStatistics = async (req, res) => {
  try {
    const stats = await getQueueStats();
    
    res.status(200).json({
      status: 'success',
      data: {
        queueStats: stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Failed to get queue statistics:', err.message);
    res.status(500).json({
      status: 'error',
      error: 'Failed to get queue statistics',
      message: err.message
    });
  }
};

// POST /notifications/consumers/start - Start all consumers
export const startConsumers = async (req, res) => {
  try {
    await startAllConsumers();
    
    res.status(200).json({
      status: 'success',
      message: 'All notification consumers started successfully'
    });
  } catch (err) {
    console.error('Failed to start consumers:', err.message);
    res.status(500).json({
      status: 'error',
      error: 'Failed to start consumers',
      message: err.message
    });
  }
};

// POST /notifications/consumers/stop - Stop all consumers
export const stopConsumers = async (req, res) => {
  try {
    await stopAllConsumers();
    
    res.status(200).json({
      status: 'success',
      message: 'All notification consumers stopped successfully'
    });
  } catch (err) {
    console.error('Failed to stop consumers:', err.message);
    res.status(500).json({
      status: 'error',
      error: 'Failed to stop consumers',
      message: err.message
    });
  }
};

// GET /notifications/consumers/status - Get consumer status
export const getConsumerStatus = async (req, res) => {
  try {
    const status = await getConsumerStatus();
    
    res.status(200).json({
      status: 'success',
      data: {
        consumerStatus: status,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Failed to get consumer status:', err.message);
    res.status(500).json({
      status: 'error',
      error: 'Failed to get consumer status',
      message: err.message
    });
  }
}; 