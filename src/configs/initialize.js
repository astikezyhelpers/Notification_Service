import redis from './redis.js';
import { connectRabbitMQ } from './rabbitmq.js';
import prisma from './db.js';

// Service initialization status
let servicesInitialized = false;

export const initializeServices = async () => {
  if (servicesInitialized) {
    console.log('Services already initialized');
    return;
  }

  try {
    console.log(' Initializing services...');

    // Test Redis connection
    await redis.ping();
    console.log('Redis connected successfully');

    // Test RabbitMQ connection
    await connectRabbitMQ();
    console.log('RabbitMQ connected successfully');

    // Test Database connection
    await prisma.$connect();
    console.log(' Database connected successfully');

    servicesInitialized = true;
    console.log(' All services initialized successfully');

  } catch (error) {
    console.error(' Service initialization failed:', error.message);
    throw error;
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log(' Shutting down services gracefully...');
  
  try {
    await prisma.$disconnect();
    console.log(' Database disconnected');
    
    redis.disconnect();
    console.log(' Redis disconnected');
    
    process.exit(0);
  } catch (error) {
    console.error(' Error during shutdown:', error.message);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown); 