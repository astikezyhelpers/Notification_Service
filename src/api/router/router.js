import express from 'express';
import {
  sendNotification,
  getUserNotificationLogs,
  getUserPreferences,
  updateUserPreferences,
  getQueueStatistics,
  startConsumers,
  stopConsumers,
  getConsumerStatus
} from '../controller/controller.js';

const router = express.Router();

// POST /notifications/send - Accepts notification job
router.post('/notifications/send', sendNotification);

// GET /notifications/{user_id} - Get user's past notification logs
router.get('/notifications/:userId', getUserNotificationLogs);

// GET /notifications/preferences/{user_id} - Fetch current preferences
router.get('/notifications/preferences/:userId', getUserPreferences);

// PUT /notifications/preferences - Update preferences
router.put('/notifications/preferences', updateUserPreferences);

// GET /notifications/queue/stats - Get RabbitMQ queue statistics
router.get('/notifications/queue/stats', getQueueStatistics);

// Consumer management endpoints
router.post('/notifications/consumers/start', startConsumers);
router.post('/notifications/consumers/stop', stopConsumers);
router.get('/notifications/consumers/status', getConsumerStatus);

export default router; 