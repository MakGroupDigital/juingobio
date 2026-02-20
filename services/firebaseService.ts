import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAoyt5CjOfLXiJWko4Y0gA735_EUEZHULo",
  authDomain: "studio-2853082048-41992.firebaseapp.com",
  projectId: "studio-2853082048-41992",
  storageBucket: "studio-2853082048-41992.firebasestorage.app",
  messagingSenderId: "589474614344",
  appId: "1:589474614344:web:74c361b5df7ee49c3fdc7d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Google Provider
const googleProvider = new GoogleAuthProvider();

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Store user photo URL in Firestore
    if (user.photoURL) {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLogin: new Date().toISOString()
      }, { merge: true });
    }
    
    return user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

// Sign out
export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Check if user exists in Firestore
export const checkUserExists = async (uid: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    const exists = userDoc.exists();
    console.log(`User ${uid} exists:`, exists);
    return exists;
  } catch (error) {
    console.error('Error checking user:', error);
    return false;
  }
};

// Get user data from Firestore
export const getUserData = async (uid: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.data();
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

// Create or update user in Firestore
export const saveUserData = async (userData: any) => {
  try {
    await setDoc(doc(db, 'users', userData.uid), userData, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving user data:', error);
    throw error;
  }
};

// Listen to auth state changes
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export default app;
