
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const itemsToRemove = [
  'vercel.json',
  'server', // Old standalone server
  'api/login.js',
  'api/me.js',
  'api/config.js',
  'api/_utils.js',
  'api/ai', // Directory: Logic moved to api/index.js
  'api/admin' // Directory: Logic moved to api/index.js
];

const remove = (itemPath) => {
  const fullPath = path.join(__dirname, itemPath);
  if (fs.existsSync(fullPath)) {
    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`✅ Deleted: ${itemPath}`);
    } catch (e) {
      console.error(`❌ Failed to delete ${itemPath}:`, e.message);
    }
  } else {
    console.log(`⚠️  Skipped (Not found): ${itemPath}`);
  }
};

console.log("🧹 Cleaning up unnecessary files...");
itemsToRemove.forEach(remove);
console.log("✨ Cleanup complete! You are ready to deploy to Netlify.");
