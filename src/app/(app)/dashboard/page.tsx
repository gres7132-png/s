
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
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface UserStats {
  availableBalance: number;
  todaysEarnings: number;
  rechargeAmount: number;
  withdrawalAmount: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (user) {
      // --- Backend Data Fetching Placeholder ---
      const fetchStats = async () => {
        setLoading(true);
        // In a real application, you would fetch this data from your backend.
        // Example: const userStats = await getStatsForUser(user.uid);
        
        // const mockStats: UserStats = {
        //   availableBalance: 52340,
        //   todaysEarnings: 166,
        //   rechargeAmount: 1300,
        //   withdrawalAmount: 0,
        // };
        // setStats(mockStats);
        
        setLoading(false);
      };
      fetchStats();
    }
  }, [user]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Control Panel</h1>
      </div>

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
