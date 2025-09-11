
"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

interface CommissionTier {
    id: string;
    referrals: number;
    commission: number;
}

export default function AgentCommissionsPage() {
  const { user } = useAuth();
  const [commissionTiers, setCommissionTiers] = useState<CommissionTier[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(true);
  const [userActiveReferrals, setUserActiveReferrals] = useState(0);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const q = query(collection(db, "commissionTiers"), orderBy("referrals"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedTiers: CommissionTier[] = [];
        querySnapshot.forEach((doc) => {
            fetchedTiers.push({ id: doc.id, ...doc.data() } as CommissionTier);
        });
        setCommissionTiers(fetchedTiers);
        setLoadingTiers(false);
    }, (error) => {
        console.error("Error fetching tiers:", error);
        setLoadingTiers(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      // --- Backend Fetching Placeholder ---
      const fetchReferralCount = async () => {
        setLoading(true);
        // const count = await getActiveReferralCount(user.uid);
        // setUserActiveReferrals(count);
        setUserActiveReferrals(0); // A new user starts with 0 referrals.
        setLoading(false);
      }
      fetchReferralCount();
    }
  }, [user]);
  
  const currentCommission = commissionTiers
    .slice()
    .reverse()
    .find(tier => userActiveReferrals >= tier.referrals)?.commission || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agent Commission Program</h1>
        <p className="text-muted-foreground">
          Earn a monthly commission based on the number of active investors you refer.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>YOUR ACTIVE REFERRALS</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{loading ? "..." : userActiveReferrals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>YOUR CURRENT MONTHLY COMMISSION</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">{loadingTiers ? "..." : formatCurrency(currentCommission)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commission Tiers</CardTitle>
          <CardDescription>
            This is a monthly commission paid to agents for bringing fully paid-up members. It is separate from the initial 5% referral bonus.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Required Referrals</TableHead>
                <TableHead className="text-right">Monthly Commission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingTiers ? (
                 <TableRow><TableCell colSpan={2} className="text-center"><Loader2 className="animate-spin"/></TableCell></TableRow>
              ) : commissionTiers.map((tier) => (
                <TableRow key={tier.id} className={userActiveReferrals >= tier.referrals ? "bg-secondary" : ""}>
                  <TableCell className="font-medium">
                    {tier.referrals}{commissionTiers[commissionTiers.length - 1].referrals === tier.referrals ? "+" : ""} Active Investors
                  </TableCell>
                  <TableCell className="text-right font-bold text-accent">{formatCurrency(tier.commission)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
       <Alert>
          <Users className="h-4 w-4" />
          <AlertTitle>How It Works</AlertTitle>
          <AlertDescription>
              Your commission is determined by the highest tier you qualify for at the end of each month. An 'active investor' is a user you referred who has purchased at least one investment package.
          </AlertDescription>
        </Alert>
    </div>
  );
}
