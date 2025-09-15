
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
  MailWarning,
  Loader2,
} from "lucide-react";
import LatestTransactions from "@/components/latest-transactions";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { db, auth } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { sendEmailVerification } from "firebase/auth";

interface UserStats {
  availableBalance: number;
  todaysEarnings: number;
  rechargeAmount: number;
  withdrawalAmount: number;
}

export default function DashboardPage() {
  const { user, emailVerified } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    if (user) {
      const userStatsDocRef = doc(db, "userStats", user.uid);
      const unsubscribe = onSnapshot(userStatsDocRef, (doc) => {
        if (doc.exists()) {
          setStats(doc.data() as UserStats);
        } else {
          // If the doc doesn't exist, initialize with default values
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
  }, [user]);

  const handleResendVerification = async () => {
    if (!user) return;
    setIsSendingEmail(true);
    try {
      await sendEmailVerification(user);
      toast({
        title: "Verification Email Sent",
        description: "Please check your inbox (and spam folder) for the verification link.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Sending Email",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
       {emailVerified === false && (
        <Alert variant="destructive">
          <MailWarning className="h-4 w-4" />
          <AlertTitle>Verify Your Email Address</AlertTitle>
          <AlertDescription className="flex justify-between items-center">
            <p>Please check your inbox to verify your email. This is required to secure your account.</p>
            <Button onClick={handleResendVerification} disabled={isSendingEmail} size="sm">
              {isSendingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Resend Email
            </Button>
          </AlertDescription>
        </Alert>
      )}
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
              1: The company will set a tax-free day for all members on the 23rd of each month. No fees will be deducted on this day.
            </p>
            <p>
              2: You can withdraw your earnings from purchased products at any time. Withdrawals are processed by our team and may take 3-5 business days.
            </p>
            <p>
              3: To ensure the sustainability of the platform, a 15% service fee is applied to all withdrawals to cover transaction and operational costs. This fee is waived on the 23rd of each month.
            </p>
            <p>
              4: You only need to have one account in the company, and multiple accounts are not allowed. The system will automatically block members with multiple accounts.
            </p>
          </CardContent>
        </Card>
      </div>

      <LatestTransactions />
    </div>
  );
}
