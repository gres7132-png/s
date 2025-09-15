
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
import { formatDistanceToNow } from 'date-fns';

// --- Automated Bot Transaction Data ---
const firstNames = ["James", "John", "David", "Chris", "Mike", "Daniel", "Mark", "Paul", "Kevin", "Brian", "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Susan", "Jessica", "Sarah", "Karen", "Nancy"];
const lastNames = ["Mwangi", "Otieno", "Kariuki", "Kimani", "Wanjala", "Njoroge", "Ochieng", "Maina", "Kamau", "Wafula"];
const transactionTypes: ('Deposit' | 'Withdrawal')[] = ['Deposit', 'Withdrawal'];

interface BotTransaction {
    id: string;
    type: 'Deposit' | 'Withdrawal';
    userName: string;
    amount: number;
    timestamp: Date;
}

const generateRandomTransaction = (): BotTransaction => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
    
    // Generate more realistic amounts
    let amount;
    if (type === 'Deposit') {
        amount = Math.floor(Math.random() * (20000 - 3000 + 1) + 3000);
    } else { // Withdrawals are typically larger
        amount = Math.floor(Math.random() * (50000 - 5000 + 1) + 5000);
    }
     // Round to nearest 100 for cleaner numbers
    amount = Math.round(amount / 100) * 100;

    return {
        id: new Date().getTime().toString() + Math.random(), // Unique ID
        type: type,
        userName: `${firstName} ${lastName.charAt(0)}.`,
        amount: amount,
        timestamp: new Date(),
    };
};


export default function LatestTransactions() {
  const [transactions, setTransactions] = useState<BotTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate initial set of transactions
    const initialTransactions = Array.from({ length: 5 }, generateRandomTransaction).sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime());
    setTransactions(initialTransactions);
    setLoading(false);

    // Set up an interval to add new transactions
    const interval = setInterval(() => {
      const newTx = generateRandomTransaction();
      setTransactions(prev => 
        [newTx, ...prev].slice(0, 7) // Keep the list size manageable
      );
    }, 5000); // Add a new transaction every 5 seconds

    return () => clearInterval(interval);
  }, []);

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
              No recent approved transactions.
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
                <p className="text-sm text-muted-foreground">{formatDistanceToNow(tx.timestamp, { addSuffix: true })}</p>
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
