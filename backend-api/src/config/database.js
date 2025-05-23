const mongoose = require('mongoose');

// Replace with your MongoDB connection string.
// For local development, it might be: 'mongodb://localhost:27017/vacation_db_mongo'
// For production, use an environment variable: process.env.MONGODB_URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vacation_db_mongo';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true, // These are good defaults but might become deprecated
      useUnifiedTopology: true, // depending on Mongoose version.
      // useCreateIndex: true, // For older Mongoose versions, ensure unique indexes work
      // useFindAndModify: false, // For older Mongoose versions
    });
    console.log('MongoDB Connected Successfully');
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    // Exit process with failure
    process.exit(1);
  }
};

// Handle Mongoose connection events (optional but good practice)
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected.');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected.');
});

module.exports = connectDB;
