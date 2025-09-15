
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User, Auth } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { usePathname, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

// --- Admin Configuration ---
// Add the email addresses of admin users to this array.
// This is a simple and secure way to manage roles for a small number of admins.
const ADMIN_EMAILS = ["gres7132@gmail.com"];

interface AuthContextType {
  user: User | null;
  loading: boolean;
  auth: Auth;
  isAdmin: boolean; // Flag to indicate if the user is an admin
  emailVerified: boolean | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  auth: auth,
  isAdmin: false,
  emailVerified: null,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        setEmailVerified(user.emailVerified);
        // Check if the logged-in user's email is in the admin list
        setIsAdmin(ADMIN_EMAILS.includes(user.email || ""));
        if (isAuthPage) {
          router.push('/dashboard');
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setEmailVerified(null);
        if (!isAuthPage && !pathname.startsWith('/website')) {
          router.push("/auth");
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthPage, router, pathname]);

  const value = { user, loading, auth, isAdmin, emailVerified };

  // Render children immediately for a faster perceived load.
  // The redirects inside the useEffect will handle routing logic.
  return (
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
