import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Category, FinanceTransaction, Order, Product, TransactionStatus } from '../types';

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
export const storage = getStorage(app);

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

export const getAllUsers = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map((entry) => ({
      uid: entry.id,
      ...entry.data()
    }));
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
};

export const onUserDataChange = (uid: string, callback: (data: any | null) => void) => {
  return onSnapshot(
    doc(db, 'users', uid),
    (snapshot) => {
      callback(snapshot.exists() ? snapshot.data() : null);
    },
    (error) => {
      console.error('Error listening user data:', error);
      callback(null);
    }
  );
};

export const onUsersChange = (callback: (users: any[]) => void) => {
  return onSnapshot(
    collection(db, 'users'),
    (snapshot) => {
      callback(snapshot.docs.map((entry) => ({ uid: entry.id, ...entry.data() })));
    },
    (error) => {
      console.error('Error listening users:', error);
      callback([]);
    }
  );
};

export const onProductsChange = (callback: (products: Product[]) => void) => {
  return onSnapshot(
    collection(db, 'products'),
    (snapshot) => {
      const data = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })) as Product[];
      callback(data);
    },
    (error) => {
      console.error('Error listening products:', error);
      callback([]);
    }
  );
};

export const createProduct = async (payload: Omit<Product, 'id'>) => {
  await addDoc(collection(db, 'products'), payload);
};

export const uploadProductMedia = async (files: File[]) => {
  const images: string[] = [];
  const videos: string[] = [];

  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageRef = ref(storage, `product-media/${Date.now()}-${safeName}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    if (file.type.startsWith('video/')) {
      videos.push(url);
    } else {
      images.push(url);
    }
  }

  return { images, videos };
};

export const updateProduct = async (productId: string, payload: Partial<Product>) => {
  await updateDoc(doc(db, 'products', productId), payload as any);
};

export const onCategoriesChange = (callback: (categories: Category[]) => void) => {
  return onSnapshot(
    collection(db, 'categories'),
    (snapshot) => {
      const data = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })) as Category[];
      callback(data);
    },
    (error) => {
      console.error('Error listening categories:', error);
      callback([]);
    }
  );
};

export const createCategory = async (payload: Omit<Category, 'id'>) => {
  await addDoc(collection(db, 'categories'), payload);
};

export const updateCategory = async (categoryId: string, payload: Partial<Category>) => {
  await updateDoc(doc(db, 'categories', categoryId), payload as any);
};

export const onOrdersChange = (callback: (orders: Order[]) => void, uid?: string, includeAll: boolean = false) => {
  const baseCollection = collection(db, 'orders');
  const ordersQuery = includeAll
    ? query(baseCollection, orderBy('created_at', 'desc'))
    : query(baseCollection, where('user_id', '==', uid || ''));

  return onSnapshot(
    ordersQuery,
    (snapshot) => {
      const data = snapshot.docs
        .map((entry) => ({ id: entry.id, ...entry.data() })) as Order[];
      data.sort((a, b) => b.created_at - a.created_at);
      callback(data);
    },
    (error) => {
      console.error('Error listening orders:', error);
      callback([]);
    }
  );
};

export const createOrder = async (payload: Omit<Order, 'id'>) => {
  const created = await addDoc(collection(db, 'orders'), payload as any);
  return created.id;
};

export const updateOrder = async (orderId: string, payload: Partial<Order>) => {
  await updateDoc(doc(db, 'orders', orderId), payload as any);
};

export const createOrderStatusNotification = async (payload: {
  user_id: string;
  order_id: string;
  status: Order['status'];
  message: string;
}) => {
  await addDoc(collection(db, 'notifications'), {
    ...payload,
    type: 'order_status',
    created_at: Date.now(),
    read: false
  });
};

export const onTransactionsChange = (callback: (transactions: FinanceTransaction[]) => void) => {
  const transactionsQuery = query(collection(db, 'transactions'), orderBy('created_at', 'desc'));
  return onSnapshot(
    transactionsQuery,
    (snapshot) => {
      const data = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })) as FinanceTransaction[];
      callback(data);
    },
    (error) => {
      console.error('Error listening transactions:', error);
      callback([]);
    }
  );
};

export const createTransaction = async (payload: Omit<FinanceTransaction, 'id' | 'created_at' | 'updated_at'>) => {
  const now = Date.now();
  const created = await addDoc(collection(db, 'transactions'), {
    ...payload,
    created_at: now,
    updated_at: now
  });
  return created.id;
};

export const updateTransaction = async (transactionId: string, payload: Partial<FinanceTransaction>) => {
  await updateDoc(doc(db, 'transactions', transactionId), {
    ...payload,
    updated_at: Date.now()
  } as any);
};

export const createFinanceNotification = async (payload: {
  user_id: string;
  transaction_id: string;
  amount: number;
  status: TransactionStatus;
  message: string;
}) => {
  await addDoc(collection(db, 'notifications'), {
    ...payload,
    type: 'finance',
    created_at: Date.now(),
    read: false
  });
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
