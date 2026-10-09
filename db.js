require('dotenv').config();
const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGODB_URI);

async function main() {
  await client.connect();
  const databaseName = process.env.MONGODB_DATABASE || 'HardwareCheckout';
  await client.db(databaseName).command({ ping: 1 });
  console.log(`MongoDB connection successful: ${databaseName}`);
  await client.close();
}

main().catch(console.error);