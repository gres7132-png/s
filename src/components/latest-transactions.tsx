
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

// In a real application, you would fetch this data from your backend.
// This is mock data for demonstration purposes.
const mockTransactions = [
    { type: 'Deposit', user: 'User...4a2b', amount: 2800, time: '1 min ago' },
    { type: 'Withdrawal', user: 'User...f8c1', amount: 39000, time: '3 mins ago' },
    { type: 'Deposit', user: 'User...3e9d', amount: 1300, time: '5 mins ago' },
    { type: 'Deposit', user: 'User...c5a7', amount: 9750, time: '8 mins ago' },
    { type: 'Withdrawal', user: 'User...b1e6', amount: 65000, time: '12 mins ago' },
];

interface Transaction {
    type: 'Deposit' | 'Withdrawal';
    user: string;
    amount: number;
    time: string;
}

export default function LatestTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching data from a backend API
    const timer = setTimeout(() => {
      setTransactions(mockTransactions);
      setLoading(false);
    }, 1500); // Simulate a network delay

    return () => clearTimeout(timer);
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
          {!loading && transactions.map((tx, index) => (
            <div key={index} className="flex items-center gap-4">
              <div>
                {tx.type === 'Deposit' ? (
                  <ArrowUpCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <ArrowDownCircle className="h-6 w-6 text-red-500" />
                )}
              </div>
              <div className="flex-grow">
                <p className="font-medium">{tx.type} by {tx.user}</p>
                <p className="text-sm text-muted-foreground">{tx.time}</p>
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
