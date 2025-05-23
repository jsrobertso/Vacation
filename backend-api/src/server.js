const app = require('./app');
const connectDB = require('./config/database'); // Import the MongoDB connection function

const PORT = process.env.PORT || 3000;

// Connect to MongoDB and then start the server
const startServer = async () => {
  try {
    await connectDB(); // Establish MongoDB connection
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    // The error during connection is already logged in connectDB
    // No need to log it again, just ensure the process exits or handles it
    console.error('Failed to start server due to database connection error.');
    process.exit(1); // Exit if DB connection fails at start
  }
};

startServer();
