import prisma from '../configs/db.js';

// Log notification delivery attempt
export async function logNotification({
  userId,
  channel,
  status,
  messageId,
  payloadPreview,
  error = null,
  retryCount = 0
}) {
  try {
    await prisma.notificationLog.create({
      data: {
        userId,
        channel,
        status,
        messageId,
        retryCount,
        payloadPreview,
        createdAt: new Date()
      }
    });

    console.log(` Logged notification: ${status} for user ${userId} via ${channel}`);
  } catch (error) {
    console.error(' Failed to log notification:', error.message);
  }
}

// Get notification statistics
export async function getNotificationStats(userId = null) {
  try {
    const where = userId ? { userId } : {};
    
    const stats = await prisma.notificationLog.groupBy({
      by: ['status', 'channel'],
      where,
      _count: {
        id: true
      }
    });

    return stats;
  } catch (error) {
    console.error(' Failed to get notification stats:', error.message);
    return [];
  }
}

// Clean old notification logs (older than 30 days)
export async function cleanOldLogs() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deleted = await prisma.notificationLog.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo
        }
      }
    });

    console.log(` Cleaned ${deleted.count} old notification logs`);
    return deleted.count;
  } catch (error) {
    console.error(' Failed to clean old logs:', error.message);
    return 0;
  }
} 