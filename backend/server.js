const app = require('./app');
const connectDB = require('./config/database');

// Load environment variables
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 HosteliQ Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Database: ${process.env.MONGODB_URI ? 'MongoDB Connected' : 'Database URI not set'}`);
  console.log(`🔗 Frontend: Served from /frontend`);
  console.log(`📱 API Base URL: http://localhost:${PORT}/api`);
});
