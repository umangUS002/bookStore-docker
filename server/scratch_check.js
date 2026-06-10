import mongoose from "mongoose";
import Book from "./models/book.js";

async function run() {
  console.log("Connecting...");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "test" });
  console.log("Connected");
  const books = await Book.find({});
  console.log(`Found ${books.length} books:`);
  for (const b of books) {
    console.log(`- Title: "${b.title}", Genre: "${b.genre}", Tags: [${b.tags.join(', ')}]`);
  }
  await mongoose.disconnect();
}
run().catch(console.error);
