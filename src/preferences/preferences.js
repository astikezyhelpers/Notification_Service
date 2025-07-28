import redis from '../configs/redis.js';
import prisma from '../configs/db.js';

// Cache TTL in seconds (1 hour)
const CACHE_TTL = 3600;

export async function getUserPreferences(userId) {
  try {
    // Try to get from cache first
    const cached = await redis.get(`user:${userId}:preferences`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get from database
    const dbPrefs = await prisma.notificationPreference.findMany({
      where: { userId },
      select: {
        channel: true,
        eventType: true,
        isEnabled: true
      }
    });

    // Transform to expected format
    const preferences = {
      email: false,
      sms: false,
      push: false
    };

    // Set preferences based on database records
    dbPrefs.forEach(pref => {
      if (pref.channel === 'email') preferences.email = pref.isEnabled;
      if (pref.channel === 'sms') preferences.sms = pref.isEnabled;
      if (pref.channel === 'push') preferences.push = pref.isEnabled;
    });

    // Cache the result
    await redis.set(`user:${userId}:preferences`, JSON.stringify(preferences), 'EX', CACHE_TTL);

    return preferences;
  } catch (error) {
    console.error('Error getting user preferences:', error);
    // Return default preferences if error
    return { email: true, sms: false, push: false };
  }
}

export async function updateUserPreferences(userId, preferences) {
  try {
    // Validate preferences structure
    const validChannels = ['email', 'sms', 'push'];
    const validEventTypes = ['booking', 'wallet', 'expense', 'rewards'];
    
    const updates = [];
    
    for (const pref of preferences) {
      if (!pref.channel || !validChannels.includes(pref.channel)) {
        throw new Error(`Invalid channel: ${pref.channel}`);
      }
      if (!pref.eventType || !validEventTypes.includes(pref.eventType)) {
        throw new Error(`Invalid eventType: ${pref.eventType}`);
      }
      if (typeof pref.isEnabled !== 'boolean') {
        throw new Error(`isEnabled must be boolean for ${pref.channel}`);
      }
      
      updates.push({
        userId,
        channel: pref.channel,
        eventType: pref.eventType,
        isEnabled: pref.isEnabled
      });
    }

    // Use upsert to create or update preferences
    const upsertPromises = updates.map(update => 
      prisma.notificationPreference.upsert({
        where: {
          userId_channel_eventType: {
            userId: update.userId,
            channel: update.channel,
            eventType: update.eventType
          }
        },
        update: {
          isEnabled: update.isEnabled,
          updatedAt: new Date()
        },
        create: {
          userId: update.userId,
          channel: update.channel,
          eventType: update.eventType,
          isEnabled: update.isEnabled
        }
      })
    );

    await Promise.all(upsertPromises);

    // Clear cache
    await redis.del(`user:${userId}:preferences`);

    // Return updated preferences
    return await getUserPreferences(userId);
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }
}

// Get preferences for specific event type
export async function getUserPreferencesForEvent(userId, eventType) {
  try {
    const allPreferences = await getUserPreferences(userId);
    
    // For now, return all preferences. In future, can be event-specific
    return allPreferences;
  } catch (error) {
    console.error('Error getting user preferences for event:', error);
    return { email: true, sms: false, push: false };
  }
}

// Clear user preferences cache
export async function clearUserPreferencesCache(userId) {
  try {
    await redis.del(`user:${userId}:preferences`);
    console.log(` Cleared preferences cache for user: ${userId}`);
  } catch (error) {
    console.error('Error clearing preferences cache:', error);
  }
} 