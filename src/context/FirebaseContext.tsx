import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  signInWithGoogle,
  signOutUser,
  validateFirestoreConnection,
} from '../services/firebase';

interface FirebaseContextType {
  user: FirebaseUser | null;
  isLoading: boolean;
  isOnline: boolean;
  signIn: () => Promise<FirebaseUser | null>;
  signOut: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  isLoading: true,
  isOnline: true,
  signIn: async () => null,
  signOut: async () => {},
});

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    validateFirestoreConnection().then((online) => {
      setIsOnline(online);
    });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    return await signInWithGoogle();
  };

  const handleSignOut = async () => {
    await signOutUser();
  };

  return (
    <FirebaseContext.Provider
      value={{
        user,
        isLoading,
        isOnline,
        signIn: handleSignIn,
        signOut: handleSignOut,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => useContext(FirebaseContext);
