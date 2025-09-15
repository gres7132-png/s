
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
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from 'date-fns';

// --- Automated Bot Transaction Data ---
// Expanded and more authentic list of Kenyan names
const firstNames = ["Abdi", "Aisha", "Akinyi", "Ann", "Anthony", "Atieno", "Baraka", "Brenda", "Brian", "Charles", "Chebet", "Chepkoech", "Cherono", "Collins", "Cynthia", "Daniel", "David", "Dennis", "Dorothy", "Elizabeth", "Esther", "Faith", "Fatuma", "Felix", "Grace", "Halima", "Ian", "James", "Jennifer", "Jepchumba", "Jessica", "John", "Joseph", "Juma", "Karen", "Kavindu", "Kevin", "Linda", "Lisa", "Mark", "Mary", "Matthew", "Maureen", "Mercy", "Michael", "Mohamed", "Moses", "Muthoni", "Mwikali", "Nancy", "Nekesa", "Njeri", "Nthenya", "Nyambura", "Omar", "Patricia", "Paul", "Peter", "Richard", "Robert", "Ruth", "Samuel", "Sandra", "Sarah", "Sharon", "Stephen", "Susan", "Thomas", "Vivian", "Wairimu", "Wambui", "Wanjiku", "William", "Zainabu"];

const lastNames = ["Abdullahi", "Achieng", "Adhiambo", "Ali", "Anyango", "Atieno", "Barasa", "Chebet", "Chepkoech", "Cherono", "Githinji", "Gitau", "Hassan", "Kamau", "Kariuki", "Kibet", "Kimani", "Kioko", "Kipkemboi", "Kipkoech", "Kiprotich", "Kipruto", "Maina", "Makokha", "Masinde", "Mbugua", "Mogaka", "Mohamed", "Munyao", "Musyoka", "Mutua", "Muthoni", "Mwangi", "Naliaka", "Njeri", "Njoroge", "Njuguna", "Nyaboke", "Nyaga", "Nyambura", "Nzioka", "Ochieng", "Odhiambo", "Okoth", "Oloo", "Omar", "Onsongo", "Onyango", "Otieno", "Ouma", "Simiyu", "Wachira", "Wafula", "Wairimu", "Wanjala", "Wanjiku"];


const transactionTypes: ('Deposit' | 'Withdrawal')[] = ['Deposit', 'Withdrawal'];
const paymentMethods = ["M-PESA", "Bank Transfer"];

interface BotTransaction {
    id: string;
    type: 'Deposit' | 'Withdrawal';
    userName: string;
    amount: number;
    timestamp: Date;
    modeOfPayment: string;
    transactionCode: string;
}

const generateRandomString = (length: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

const generateRandomTransaction = (): BotTransaction => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
    const modeOfPayment = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    
    let amount;
    if (type === 'Deposit') {
        amount = Math.floor(Math.random() * (20000 - 3000 + 1) + 3000);
    } else {
        amount = Math.floor(Math.random() * (50000 - 5000 + 1) + 5000);
    }
    // Make the amount a round number, which is more realistic
    amount = Math.round(amount / 100) * 100;

    const fullCode = `S${generateRandomString(9)}`;
    // Mask the transaction code for realism and security feel
    const transactionCode = `${fullCode.substring(0, 4)}...${fullCode.substring(7)}`;


    return {
        id: new Date().getTime().toString() + Math.random(),
        type: type,
        userName: `${firstName} ${lastName}`,
        amount: amount,
        timestamp: new Date(),
        modeOfPayment: modeOfPayment,
        transactionCode: transactionCode,
    };
};


export default function LatestTransactions() {
  const [transactions, setTransactions] = useState<BotTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialTransactions = Array.from({ length: 5 }, generateRandomTransaction).sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime());
    setTransactions(initialTransactions);
    setLoading(false);

    // This interval creates the "live" feeling
    const interval = setInterval(() => {
      const newTx = generateRandomTransaction();
      setTransactions(prev => 
        // Add the new transaction to the top and keep the list at 7 items
        [newTx, ...prev].slice(0, 7)
      );
    }, 5000); // A new transaction appears every 5 seconds

    return () => clearInterval(interval);
  }, []);
  
  const getPaymentIcon = (method: string) => {
    switch (method) {
        case "M-PESA": return <Smartphone className="h-4 w-4" />;
        case "Bank Transfer": return <Landmark className="h-4 w-4" />;
        default: return <Banknote className="h-4 w-4" />;
    }
  }

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
