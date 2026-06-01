import mongoose from "mongoose";

if (!process.env.DATABASE) {
  console.error(`[${new Date().toISOString()}] No database value specified...`);
}

const initializeDatabase = async (connectionString: string) => {
  const connect = async () => {
    try {
      await mongoose.connect(connectionString);
      console.info(`[${new Date().toISOString()}] Connected to MongoDB`);
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error connecting to MongoDB`,
        error
      );
      // Retry connection after 5 seconds
      setTimeout(() => connect(), 5000);
    }
  };

  mongoose.connection.on("connected", () => {
    console.info(`[${new Date().toISOString()}] Mongoose connected`);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn(
      `[${new Date().toISOString()}] Mongoose disconnected. Attempting reconnect...`
    );
    setTimeout(() => connect(), 5000);
  });

  mongoose.connection.on("error", (err) => {
    console.error(
      `[${new Date().toISOString()}] Mongoose connection error:`,
      err
    );
  });

  await connect();
};

export default initializeDatabase;
