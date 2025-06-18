import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadJSON } from '../middleware/helperFunction.js';
// __dirname setup for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filepath = path.join(__dirname, '..','colabnotes-12dd6-firebase-adminsdk-fbsvc-acc42fee8b.json');


const serviceAccount = await loadJSON(filepath);



// Initialize Firebase Admin SDK
admin.initializeApp({
  
  credential: admin.credential.cert(serviceAccount)
});

export const firestore = admin.firestore();
