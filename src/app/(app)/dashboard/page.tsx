
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/utils";
import {
  Activity,
  AlertOctagon,
  ArrowDown,
  ArrowUp,
  DollarSign,
} from "lucide-react";
import LatestTransactions from "@/components/latest-transactions";
import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, getDocs, collection, query, where, Timestamp, runTransaction } from "firebase/firestore";
import { isBefore, startOfDay } from 'date-fns';
import AiSuggestions from "@/components/ai-suggestions";

interface UserStats {
  availableBalance: number;
  todaysEarnings: number;
  rechargeAmount: number;
  withdrawalAmount: number;
}

interface Investment {
    dailyReturn: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  const calculateAndCreditEarnings = useCallback(async () => {
    if (!user) return;

    try {
      await runTransaction(db, async (transaction) => {
        const earningsLogRef = doc(db, "earningsLog", user.uid);
        const earningsLogDoc = await transaction.get(earningsLogRef);

        const lastCalculated = earningsLogDoc.exists() 
          ? (earningsLogDoc.data().lastCalculated as Timestamp).toDate()
          : new Date(0); // The epoch

        // Only run if the last calculation was before today
        if (isBefore(lastCalculated, startOfDay(new Date()))) {
            const investmentsQuery = query(collection(db, "users", user.uid, "investments"), where("status", "==", "active"));
            const investmentsSnapshot = await getDocs(investmentsQuery);

            if (investmentsSnapshot.empty) {
                // If there are no investments, just update the log and reset today's earnings
                const userStatsRef = doc(db, "userStats", user.uid);
                const userStatsDoc = await transaction.get(userStatsRef);
                if(userStatsDoc.exists() && userStatsDoc.data().todaysEarnings > 0) {
                   transaction.update(userStatsRef, { todaysEarnings: 0 });
                }
                transaction.set(earningsLogRef, { lastCalculated: new Date() }, { merge: true });
                return;
            };

            const totalDailyReturn = investmentsSnapshot.docs.reduce((sum, doc) => {
                const investment = doc.data() as Investment;
                return sum + (investment.dailyReturn || 0);
            }, 0);

            if (totalDailyReturn > 0) {
                const userStatsRef = doc(db, "userStats", user.uid);
                const userStatsDoc = await transaction.get(userStatsRef);

                if (!userStatsDoc.exists()) {
                    console.error("User stats not found, cannot credit earnings.");
                    return;
                }

                const currentStats = userStatsDoc.data() as UserStats;
                const newBalance = currentStats.availableBalance + totalDailyReturn;

                transaction.update(userStatsRef, {
                    availableBalance: newBalance,
                    todaysEarnings: totalDailyReturn
                });
            } else {
                 // Reset todaysEarnings if no active returns
                const userStatsRef = doc(db, "userStats", user.uid);
                transaction.update(userStatsRef, { todaysEarnings: 0 });
            }
            
            // Update the log regardless
            transaction.set(earningsLogRef, { lastCalculated: new Date() }, { merge: true });
        }
      });
    } catch (error) {
      console.error("Failed to calculate and credit daily earnings:", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      calculateAndCreditEarnings();

      const userStatsDocRef = doc(db, "userStats", user.uid);
      const unsubscribe = onSnapshot(userStatsDocRef, (doc) => {
        if (doc.exists()) {
          setStats(doc.data() as UserStats);
        } else {
          setStats({
            availableBalance: 0,
            todaysEarnings: 0,
            rechargeAmount: 0,
            withdrawalAmount: 0,
          });
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching user stats:", error);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [user, calculateAndCreditEarnings]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Control Panel</h1>
      </div>
      
      <AiSuggestions />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  {loading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(stats?.availableBalance ?? 0)}</div>}
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Earnings</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                   {loading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(stats?.todaysEarnings ?? 0)}</div>}
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Recharge Amount</CardTitle>
                  <ArrowUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                   {loading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(stats?.rechargeAmount ?? 0)}</div>}
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Withdrawal Amount</CardTitle>
                  <ArrowDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                   {loading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(stats?.withdrawalAmount ?? 0)}</div>}
              </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertOctagon className="h-5 w-5" />
              Notification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-muted-foreground">
            <p>
              1: After waiting for 24 hours, you can withdraw the income from purchasing company products, and you can withdraw cash immediately without any requirements.
            </p>
            <p>
              2: The company's withdrawal fee needs to deduct 10% tax, because the company is an American company and needs to pay taxes to the United States. However, the company will set a tax-free day for all members on the 23rd of each month. No fees will be deducted on this day.
            </p>
            <p>
              3: You only need to have one account in the company, and multiple accounts are not allowed. The system will automatically block members with multiple accounts.
            </p>
          </CardContent>
        </Card>
      </div>

      <LatestTransactions />
    </div>
  );
}

    