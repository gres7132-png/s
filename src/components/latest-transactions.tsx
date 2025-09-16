
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { ArrowDownCircle, ArrowUpCircle, Banknote, Landmark, Smartphone } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from 'date-fns';
import { getLiveTransactionsData, LiveTransactionsData } from "@/ai/flows/get-live-transactions-data";


// --- Automated Bot Transaction Data ---
const transactionTypes: ('Deposit' | 'Withdrawal')[] = ['Deposit', 'Withdrawal'];
const paymentMethods = ["M-PESA", "M-PESA", "M-PESA", "M-PESA", "Bank Transfer", "M-PESA", "M-PESA", "M-PESA"];

interface BotTransaction {
    id: string;
    type: 'Deposit' | 'Withdrawal';
    userName: string;
    amount: number;
    timestamp: Date;
    modeOfPayment: string;
    transactionCode: string;
    isBot: boolean;
}

const generateRandomString = (length: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Function to generate a new bot transaction, now with access to real users and package prices
const generateRandomTransaction = (
    realUsers: { displayName: string }[] = [],
    packagePrices: number[] = []
): BotTransaction => {
    let userName = 'Anonymous';
    if (realUsers.length > 0) {
        const randomRealUser = realUsers[Math.floor(Math.random() * realUsers.length)];
        userName = randomRealUser.displayName;
    }

    const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
    const modeOfPayment = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    
    let amount;
    if (type === 'Deposit' && packagePrices.length > 0 && Math.random() < 0.8) {
        amount = packagePrices[Math.floor(Math.random() * packagePrices.length)];
    } else if (type === 'Deposit') {
        amount = Math.random() * (5000 - 500) + 500;
    } else {
        amount = Math.random() * (50000 - 1000) + 1000;
    }

    const randomCodePart = generateRandomString(8);
    const fullCode = 'TI' + randomCodePart;
    const transactionCode = `${fullCode.substring(0, 3)}...${fullCode.substring(7)}`;
    
    const timestamp = new Date(new Date().getTime() - Math.random() * 1000 * 60 * 3);

    return {
        id: new Date().getTime().toString() + Math.random(),
        type: type,
        userName: userName,
        amount: amount,
        timestamp: timestamp,
        modeOfPayment: modeOfPayment,
        transactionCode: transactionCode,
        isBot: true,
    };
};


export default function LatestTransactions() {
  const [transactions, setTransactions] = useState<BotTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveData, setLiveData] = useState<LiveTransactionsData | null>(null);

  useEffect(() => {
    async function fetchData() {
        try {
            const data = await getLiveTransactionsData();
            setLiveData(data);

            const realTransactions = data.recentTransactions.map(tx => ({
                id: tx.timestamp + tx.userName + tx.amount,
                type: tx.type,
                userName: tx.userName,
                amount: tx.amount,
                timestamp: new Date(tx.timestamp),
                modeOfPayment: 'M-PESA', // Defaulting for real tx
                transactionCode: 'TX...REAL',
                isBot: false,
            }));

            const initialBotTransactions = Array.from({ length: Math.max(0, 7 - realTransactions.length) }, () => 
                generateRandomTransaction(data.users, data.packagePrices)
            );

            setTransactions([...realTransactions, ...initialBotTransactions].sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()));

        } catch (error) {
            console.error("Failed to fetch live transaction data:", error);
            // Fallback to bot-only if the fetch fails
            const initialBotTransactions = Array.from({ length: 7 }, () => generateRandomTransaction([], []));
            setTransactions(initialBotTransactions.sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()));
        } finally {
            setLoading(false);
        }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if(loading || !liveData) return;

    const interval = setInterval(() => {
      const newTx = generateRandomTransaction(liveData?.users, liveData?.packagePrices);
      setTransactions(prev => {
          const newState = [newTx, ...prev].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          // Only keep real transactions and a few bot ones to keep the list from growing indefinitely
          const realTxs = newState.filter(tx => !tx.isBot);
          const botTxs = newState.filter(tx => tx.isBot);
          return [...realTxs, ...botTxs.slice(0, 7 - realTxs.length)];
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [loading, liveData]);
  
  const getPaymentIcon = (method: string) => {
    switch (method) {
        case "M-PESA": return <Smartphone className="h-4 w-4" />;
        case "Bank Transfer": return <Landmark className="h-4 w-4" />;
        default: return <Banknote className="h-4 w-4" />;
    }
  }

  const sortedTransactions = useMemo(() => {
    return transactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 7);
  }, [transactions]);

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
          {!loading && sortedTransactions.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No recent approved transactions.
            </p>
          )}
          {!loading && sortedTransactions.map((tx) => (
            <div key={tx.id} className="flex items-center gap-4">
              <div>
                {tx.type === 'Deposit' ? (
                  <ArrowUpCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <ArrowDownCircle className="h-6 w-6 text-red-500" />
                )}
              </div>
              <div className="flex-grow space-y-1">
                <p className="font-medium">{tx.type} by {tx.userName}</p>
                <div className="text-sm text-muted-foreground flex items-center gap-4">
                    <span>{formatDistanceToNow(tx.timestamp, { addSuffix: true })}</span>
                    <span className="flex items-center gap-1">{getPaymentIcon(tx.modeOfPayment)} {tx.modeOfPayment}</span>
                    <span className="font-mono text-xs hidden sm:inline">ID: {tx.transactionCode}</span>
                </div>
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
