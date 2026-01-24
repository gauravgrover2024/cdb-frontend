import { MongoClient } from "mongodb";

const uri =
  "mongodb+srv://gauravgrover:uQjRFOimiRgVDvBa@cluster0.uijfp7e.mongodb.net/?appName=Cluster0";

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("cdb_app");
  console.log("Connected OK:", db.databaseName);
  await client.close();
}

run().catch(console.error);
