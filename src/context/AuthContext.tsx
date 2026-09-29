import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  validateFirestoreConnection,
} from '../services/firebase';
import { localDB, DEFAULT_USER } from '../services/localStore';
import { User } from '../types';

export interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnline: boolean;
  loginWithGoogle: () => Promise<User>;
  loginWithEmail: (email: string, pass: string) => Promise<User>;
  signUpWithEmail: (name: string, email: string, pass: string) => Promise<User>;
  loginAsDemo: () => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => localDB.getCurrentUser());
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    validateFirestoreConnection().then((online) => {
      setIsOnline(online);
    });

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const mappedUser: User = {
          id: fbUser.uid,
          email: fbUser.email || 'user@example.com',
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Workspace User',
          avatar_url: fbUser.photoURL || '',
          created_at: fbUser.metadata.creationTime || new Date().toISOString(),
        };
        setUser(mappedUser);
        localDB.setCurrentUser(mappedUser);
      } else {
        // If not logged into Firebase, check if local user was remembered
        const local = localDB.getCurrentUser();
        setUser(local);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLoginWithGoogle = async (): Promise<User> => {
    setIsLoading(true);
    try {
      const fbUser = await signInWithGoogle();
      if (!fbUser) throw new Error('Google sign-in was cancelled');
      const mappedUser: User = {
        id: fbUser.uid,
        email: fbUser.email || 'user@example.com',
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Workspace User',
        avatar_url: fbUser.photoURL || '',
        created_at: fbUser.metadata.creationTime || new Date().toISOString(),
      };
      setUser(mappedUser);
      localDB.setCurrentUser(mappedUser);
      return mappedUser;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginWithEmail = async (email: string, pass: string): Promise<User> => {
    setIsLoading(true);
    try {
      // Try Firebase auth first
      try {
        const fbUser = await signInWithEmail(email, pass);
        if (fbUser) {
          const mappedUser: User = {
            id: fbUser.uid,
            email: fbUser.email || email,
            name: fbUser.displayName || email.split('@')[0],
            avatar_url: fbUser.photoURL || '',
            created_at: fbUser.metadata.creationTime || new Date().toISOString(),
          };
          setUser(mappedUser);
          localDB.setCurrentUser(mappedUser);
          return mappedUser;
        }
      } catch (fbErr: any) {
        // If Firebase auth fails (e.g. offline or user exists locally), fall back to local authentication
        console.warn('Firebase email login note:', fbErr?.message || fbErr);
      }

      // Local / Offline authentication fallback
      const localUser: User = {
        id: `usr-${email.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'local'}`,
        email: email.trim(),
        name: email.split('@')[0] || 'Workspace User',
        avatar_url: '',
        created_at: new Date().toISOString(),
      };
      setUser(localUser);
      localDB.setCurrentUser(localUser);
      return localUser;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpWithEmail = async (name: string, email: string, pass: string): Promise<User> => {
    setIsLoading(true);
    try {
      try {
        const fbUser = await signUpWithEmail(name, email, pass);
        if (fbUser) {
          const mappedUser: User = {
            id: fbUser.uid,
            email: fbUser.email || email,
            name: name || fbUser.displayName || email.split('@')[0],
            avatar_url: fbUser.photoURL || '',
            created_at: fbUser.metadata.creationTime || new Date().toISOString(),
          };
          setUser(mappedUser);
          localDB.setCurrentUser(mappedUser);
          return mappedUser;
        }
      } catch (fbErr: any) {
        console.warn('Firebase email signup note:', fbErr?.message || fbErr);
      }

      const localUser: User = {
        id: `usr-${Date.now()}`,
        email: email.trim(),
        name: name.trim() || email.split('@')[0],
        avatar_url: '',
        created_at: new Date().toISOString(),
      };
      setUser(localUser);
      localDB.setCurrentUser(localUser);
      return localUser;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginAsDemo = async (): Promise<User> => {
    setIsLoading(true);
    try {
      const demoUser = DEFAULT_USER;
      setUser(demoUser);
      localDB.setCurrentUser(demoUser);
      return demoUser;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await signOutUser();
    } catch (e) {
      console.error('Sign-out error:', e);
    }
    localDB.setCurrentUser(null);
    setUser(null);
    setFirebaseUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isLoading,
        isAuthenticated: Boolean(user),
        isOnline,
        loginWithGoogle: handleLoginWithGoogle,
        loginWithEmail: handleLoginWithEmail,
        signUpWithEmail: handleSignUpWithEmail,
        loginAsDemo: handleLoginAsDemo,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
