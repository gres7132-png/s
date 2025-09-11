
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
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, limit, Timestamp } from "firebase/firestore";
import { formatDistanceToNow } from 'date-fns';

interface Transaction {
    id: string;
    type: 'Deposit' | 'Withdrawal';
    userName: string;
    amount: number;
    timestamp: Timestamp;
}

export default function LatestTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    
    const depositsQuery = query(collection(db, "transactionProofs"), orderBy("submittedAt", "desc"), limit(5));
    const withdrawalsQuery = query(collection(db, "withdrawalRequests"), orderBy("requestedAt", "desc"), limit(5));

    const unsubDeposits = onSnapshot(depositsQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const data = change.doc.data();
                const newTx: Transaction = {
                    id: `dep-${change.doc.id}`,
                    type: 'Deposit',
                    userName: data.userName,
                    amount: data.amount || 0, // Assuming deposit amount is stored in proofs
                    timestamp: data.submittedAt
                };
                 setTransactions(prev => [...prev, newTx].sort((a,b) => b.timestamp.toMillis() - a.timestamp.toMillis()).slice(0, 5));
            }
        });
        setLoading(false);
    });

    const unsubWithdrawals = onSnapshot(withdrawalsQuery, (snapshot) => {
       snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const data = change.doc.data();
                const newTx: Transaction = {
                    id: `wd-${change.doc.id}`,
                    type: 'Withdrawal',
                    userName: data.userName,
                    amount: data.amount,
                    timestamp: data.requestedAt
                };
                setTransactions(prev => [...prev, newTx].sort((a,b) => b.timestamp.toMillis() - a.timestamp.toMillis()).slice(0, 5));
            }
        });
        setLoading(false);
    });
    
    return () => {
        unsubDeposits();
        unsubWithdrawals();
    };

  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Transactions</CardTitle>
        <CardDescription>
          See the latest deposits and withdrawals happening on the platform.
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
                <p className="font-medium">{tx.type} by {tx.userName}</p>
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
