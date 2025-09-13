
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, limit, Timestamp, doc, getDoc } from "firebase/firestore";
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from "@/hooks/use-auth";

interface Transaction {
    id: string;
    type: 'Deposit' | 'Withdrawal';
    userId: string;
    amount: number;
    timestamp: Timestamp;
}

interface UserDisplayInfo {
    displayName?: string;
}

export default function LatestTransactions() {
  const { user } = useAuth(); // We still need user to know when to start fetching
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userCache, setUserCache] = useState<Record<string, UserDisplayInfo>>({});
  const [loading, setLoading] = useState(true);

  const fetchUserDetails = useCallback(async (userId: string) => {
    if (userCache[userId]) {
        return;
    }
    try {
        const userDocRef = doc(db, "users", userId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const userData = {
                displayName: userDoc.data().displayName,
            };
            setUserCache(prev => ({...prev, [userId]: userData}));
        }
    } catch (error) {
        console.error("Failed to fetch user details for cache:", error);
    }
  }, [userCache]);


  useEffect(() => {
    // Only start fetching once the user is authenticated, to ensure we have user context if needed,
    // even though the queries are now global.
    if (!user) return;

    setLoading(true);
    
    // CORRECTED: Queries now fetch the latest 5 transactions from the entire collection,
    // not just for the current user.
    const depositsQuery = query(
        collection(db, "transactionProofs"), 
        orderBy("submittedAt", "desc"), 
        limit(5)
    );
    const withdrawalsQuery = query(
        collection(db, "withdrawalRequests"), 
        orderBy("requestedAt", "desc"), 
        limit(5)
    );

    const processSnapshot = (snapshot: any, type: 'Deposit' | 'Withdrawal') => {
        snapshot.docChanges().forEach((change: any) => {
            if (change.type === "added" || change.type === "modified") {
                const data = change.doc.data();
                if (data.userId) fetchUserDetails(data.userId);

                // We only care about approved transactions for a live feed
                if (data.status !== 'approved') return;

                const newTx: Transaction = {
                    id: `${type.toLowerCase()}-${change.doc.id}`,
                    type: type,
                    userId: data.userId,
                    amount: data.amount || 0,
                    timestamp: type === 'Deposit' ? data.submittedAt : data.requestedAt
                };
                 // Add or update the transaction, then sort and slice.
                 setTransactions(prev => {
                    const filtered = prev.filter(tx => tx.id !== newTx.id);
                    return [...filtered, newTx]
                        .sort((a,b) => b.timestamp.toMillis() - a.timestamp.toMillis())
                        .slice(0, 5);
                 });
            }
        });
        setLoading(false);
    };

    const unsubDeposits = onSnapshot(depositsQuery, (snapshot) => processSnapshot(snapshot, 'Deposit'), (err) => {
        console.error("Deposits subscription error:", err);
        setLoading(false);
    });
    const unsubWithdrawals = onSnapshot(withdrawalsQuery, (snapshot) => processSnapshot(snapshot, 'Withdrawal'), (err) => {
        console.error("Withdrawals subscription error:", err);
        setLoading(false);
    });
    
    return () => {
        unsubDeposits();
        unsubWithdrawals();
    };

  }, [user, fetchUserDetails]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Transactions</CardTitle>
        <CardDescription>
          See the latest approved deposits and withdrawals on the platform.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading && Array.from({ length: 5 }).map((_, i) => (
             <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-grow space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                </div>
                 <Skeleton className="h-5 w-1/4" />
             </div>
          ))}
          {!loading && transactions.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No recent transactions.
            </p>
          )}
          {!loading && transactions.map((tx) => (
            <div key={tx.id} className="flex items-center gap-4">
              <div>
                {tx.type === 'Deposit' ? (
                  <ArrowUpCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <ArrowDownCircle className="h-6 w-6 text-red-500" />
                )}
              </div>
              <div className="flex-grow">
                <p className="font-medium">{tx.type} by {userCache[tx.userId]?.displayName || '... a user'}</p>
                <p className="text-sm text-muted-foreground">{tx.timestamp ? formatDistanceToNow(tx.timestamp.toDate(), { addSuffix: true }) : 'Just now'}</p>
              </div>
              <div className="font-bold text-right">
                {formatCurrency(tx.amount)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
