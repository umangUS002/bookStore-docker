import { Client } from "@elastic/elasticsearch";
import Book from "../models/book.js";

const ES_URL = process.env.ELASTICSEARCH_URL || "http://localhost:9200";

const esClient = new Client({
  node: ES_URL,
});

const INDEX_NAME = "books";

export async function initElasticsearch() {
  const maxRetries = 15;
  const delayMs = 3000;

  for (let i = 1; i <= maxRetries; i++) {
    try {
      // 1. Check connection
      const health = await esClient.cluster.health({});
      console.log(`✅ Connected to Elasticsearch (status: ${health.status})`);

      // 2. Create index if not exists
      const indexExists = await esClient.indices.exists({ index: INDEX_NAME });

      if (!indexExists) {
        console.log(`Creating Elasticsearch index: ${INDEX_NAME}...`);
        await esClient.indices.create({
          index: INDEX_NAME,
          body: {
            settings: {
              analysis: {
                filter: {
                  book_synonyms: {
                    type: "synonym",
                    synonyms: [
                      "scifi, sci-fi, science fiction",
                      "fantasy, magic, wizard, hogwarts",
                      "nonfiction, non-fiction, biography, autobiography",
                      "self-help, self help, motivation, personal growth, productivity",
                      "novel, fiction, literature",
                      "kids, children, young adult, ya"
                    ]
                  }
                },
                analyzer: {
                  book_analyzer: {
                    tokenizer: "standard",
                    filter: ["lowercase", "book_synonyms"]
                  }
                }
              }
            },
            mappings: {
              properties: {
                id: { type: "keyword" },
                title: { type: "text", analyzer: "book_analyzer" },
                author: { type: "text", analyzer: "book_analyzer" },
                description: { type: "text", analyzer: "book_analyzer" },
                genre: { type: "keyword" },
                publisher: { type: "text" },
                language: { type: "keyword" },
                rating: { type: "float" },
                tags: { type: "text", analyzer: "book_analyzer" }
              }
            }
          }
        });
        console.log("✅ Elasticsearch index mappings created successfully");
      }

      // Sync existing books from MongoDB to Elasticsearch
      try {
        const books = await Book.find({ isPublished: true });
        console.log(`Syncing ${books.length} books to Elasticsearch...`);
        for (const book of books) {
          await indexBook(book);
        }
        console.log("✅ Elasticsearch sync complete");
      } catch (syncErr) {
        console.error("⚠️ Elasticsearch startup sync failed:", syncErr.message);
      }

      return; // Exit loop on successful initialization
    } catch (error) {
      console.log(`⚠️ Elasticsearch connection attempt ${i}/${maxRetries} failed: ${error.message}`);
      if (i < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        console.error("❌ Elasticsearch initialization failed after maximum retries");
      }
    }
  }
}

// Helper: Index a book doc
export async function indexBook(book) {
  try {
    await esClient.index({
      index: INDEX_NAME,
      id: book._id.toString(),
      body: {
        id: book._id.toString(),
        title: book.title,
        author: book.author,
        description: book.description,
        genre: book.genre,
        publisher: book.publisher,
        language: book.language,
        rating: book.rating,
        tags: book.tags || []
      }
    });
    console.log(`Synced book to ES: "${book.title}"`);
  } catch (err) {
    console.error(`Failed to sync book to ES: ${err.message}`);
  }
}

// Helper: Delete a book doc
export async function deleteBookFromIndex(bookId) {
  try {
    await esClient.delete({
      index: INDEX_NAME,
      id: bookId.toString()
    });
    console.log(`Deleted book from ES: ${bookId}`);
  } catch (err) {
    console.error(`Failed to delete book from ES: ${err.message}`);
  }
}

export default esClient;
