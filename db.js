require('dotenv').config();
const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGODB_URI);

async function main() {
  await client.connect();
  const db = client.db('myapp');
  const users = db.collection('users');
  await users.insertOne({ name: 'Ada' });
  console.log(await users.findOne({ name: 'Ada' }));
  await client.close();
}

main().catch(console.error);