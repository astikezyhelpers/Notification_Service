import amqplib from 'amqplib';

let connection;
let channel;

const connectRabbitMQ = async () => {
  try {
    if (connection && channel) {
      return { connection, channel };
    }

    const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    connection = await amqplib.connect(url);
    channel = await connection.createChannel();

    // Set up error handling
    connection.on('error', (err) => {
      console.error(' RabbitMQ connection error:', err.message);
    });

    connection.on('close', () => {
      console.log(' RabbitMQ connection closed');
    });

    console.log(' Connected to RabbitMQ');
    return { connection, channel };
  } catch (error) {
    console.error(' Error connecting to RabbitMQ:', error.message);
    throw error;
  }
};

const getChannel = () => {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized. Call connectRabbitMQ() first.');
  }
  return channel;
};

const getConnection = () => {
  if (!connection) {
    throw new Error('RabbitMQ connection not initialized. Call connectRabbitMQ() first.');
  }
  return connection;
};

export { connectRabbitMQ, getChannel, getConnection }; 