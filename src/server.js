import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import router from './api/router/router.js';
import { initializeServices } from './configs/initialize.js';
import { startAllConsumers } from './consumers/notificationConsumer.js';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'notification-service'
  });
});

// API routes
app.use('/api', router);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Initialize services and start server
const startServer = async () => {
  try {
    // Initialize all services (Redis, RabbitMQ, Database)
    await initializeServices();
    
    // Start all notification consumers
    await startAllConsumers();
    
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(` Notification Service running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API Base: http://localhost:${PORT}/api`);
      console.log('All notification consumers started successfully');
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

export default app; 