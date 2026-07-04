const { MongoClient } = require('mongodb');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log("=========================================");
  console.log("Remote Database Migration Utility");
  console.log("=========================================\n");

  const sourceUri = await question("Enter the ORIGINAL Database URI (Source): ");
  const targetUri = await question("Enter the NEW Database URI (Target): ");

  if (!sourceUri || !targetUri) {
    console.error("Both URIs are required!");
    rl.close();
    return;
  }

  console.log("\nConnecting to Source DB...");
  const sourceClient = new MongoClient(sourceUri);
  await sourceClient.connect();
  const sourceDb = sourceClient.db();
  console.log(`Successfully connected to Source DB: ${sourceDb.databaseName}`);

  console.log("Connecting to Target DB...");
  const targetClient = new MongoClient(targetUri);
  await targetClient.connect();
  const targetDb = targetClient.db();
  console.log(`Successfully connected to Target DB: ${targetDb.databaseName}\n`);

  const collections = await sourceDb.listCollections().toArray();
  
  if (collections.length === 0) {
    console.log("Source database has no collections.");
  } else {
    for (const collInfo of collections) {
      const collName = collInfo.name;
      console.log(`Fetching documents from [${collName}]...`);
      
      const docs = await sourceDb.collection(collName).find({}).toArray();
      
      if (docs.length > 0) {
        console.log(`Found ${docs.length} documents. Copying to target...`);
        try {
          await targetDb.collection(collName).insertMany(docs);
          console.log(`✅ Successfully copied ${collName}`);
        } catch (err) {
          console.error(`❌ Failed to copy ${collName}: ${err.message}`);
        }
      } else {
        console.log(`⚠️ Collection [${collName}] is empty, skipping.`);
      }
    }
  }

  console.log("\n=========================================");
  console.log("Migration Complete!");
  console.log("=========================================\n");
  
  await sourceClient.close();
  await targetClient.close();
  rl.close();
}

main().catch(err => {
  console.error("Migration Error:", err);
  process.exit(1);
});
