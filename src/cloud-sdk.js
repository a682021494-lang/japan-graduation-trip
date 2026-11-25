export { initializeApp } from 'firebase/app';
export {
  browserLocalPersistence, browserPopupRedirectResolver, connectAuthEmulator, deleteUser, GoogleAuthProvider, initializeAuth,
  onAuthStateChanged, reauthenticateWithPopup, signInWithPopup, signOut
} from 'firebase/auth';
export {
  collection, connectFirestoreEmulator, deleteDoc, doc, increment, getDocFromServer, getDocsFromServer,
  getFirestore, onSnapshot, runTransaction, serverTimestamp, setDoc, updateDoc, writeBatch
} from 'firebase/firestore';
