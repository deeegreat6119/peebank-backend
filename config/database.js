const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB with URI:', process.env.DB_URI);
    const conn = await mongoose.connect(process.env.DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("Connected to MongoDB");
    console.log('Host:', conn.connection.host);
    console.log('Database name:', conn.connection.name);
    console.log('Collections:', await conn.connection.db.listCollections().toArray());
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
