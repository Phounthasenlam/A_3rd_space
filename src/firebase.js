import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBjYvXUT_Gne6YvyAVRuyDCnaXvLq7nDIo",
  authDomain: "my-little-corner-646b3.firebaseapp.com",
  databaseURL: "https://my-little-corner-646b3-default-rtdb.firebaseio.com/", 
  projectId: "my-little-corner-646b3",
  storageBucket: "my-little-corner-646b3.firebasestorage.app",
  messagingSenderId: "127890553024",
  appId: "1:127890553024:web:ee9d29aff6d5dcafecd525"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);