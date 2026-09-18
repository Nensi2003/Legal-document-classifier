import { seedDocumentTypes } from "./seed/documentTypes";

async function main() {
  await seedDocumentTypes();

  console.log("Database seeding completed.");
}

main().catch((error) => {
  console.error("Database seeding failed:", error);
  process.exit(1);
});