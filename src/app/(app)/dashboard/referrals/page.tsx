
"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Copy, Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, getDocs } from "firebase/firestore";

// This interface defines the structure for a referred user object.
interface ReferredUser {
    id: string;
    name: string;
    capital: number;
    commission: number;
    status: 'Active' | 'Pending';
}

export default function ReferralsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [referralLink, setReferralLink] = useState("");
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReferredUsers = useCallback(async (userId: string) => {
    setLoading(true);
    const referralsColRef = collection(db, "users", userId, "referrals");
    const referralsQuery = query(referralsColRef);

    const unsubscribe = onSnapshot(referralsQuery, async (snapshot) => {
      const users: ReferredUser[] = [];
      for (const doc of snapshot.docs) {
        const referredUserId = doc.id;
        const referredUserData = doc.data();

        // Now, get the total investment for this referred user
        const investmentsColRef = collection(db, "users", referredUserId, "investments");
        const investmentsSnapshot = await getDocs(investmentsColRef);
        
        let totalInvested = 0;
        investmentsSnapshot.forEach(investmentDoc => {
          totalInvested += investmentDoc.data().price || 0;
        });

        const commission = totalInvested * 0.05; // 5% commission
        const status: 'Active' | 'Pending' = totalInvested > 0 ? 'Active' : 'Pending';

        users.push({
          id: referredUserId,
          name: referredUserData.displayName,
          capital: totalInvested,
          commission: commission,
          status: status,
        });
      }
      setReferredUsers(users);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
      setReferralLink(`${window.location.origin}/auth?ref=${user.uid}`);
      const unsub = fetchReferredUsers(user.uid);
      return () => { unsub.then(u => u()) };
    }
  }, [user, fetchReferredUsers]);

  const copyToClipboard = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Copied!",
      description: "Your referral link has been copied to your clipboard.",
    });
  };

  const totalCommission = referredUsers.reduce((sum, u) => sum + u.commission, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Referral Program</h1>
        <p className="text-muted-foreground">
          Earn multi-level commissions from your network's investments.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Unique Referral Link</CardTitle>
          <CardDescription>
            Share this link with your friends. When they sign up and invest, you get rewarded.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 rounded-lg border bg-muted p-2">
            <p className="flex-grow text-sm truncate text-muted-foreground">
              {referralLink || "Loading your link..."}
            </p>
            <Button size="icon" variant="ghost" onClick={copyToClipboard} disabled={!referralLink}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

       <Alert>
          <Users className="h-4 w-4" />
          <AlertTitle>Multi-Level Commission Structure</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Level 1:</strong> Earn a <strong>5%</strong> commission on the initial deposit of users you directly refer.</li>
                <li><strong>Level 2:</strong> Earn a <strong>1%</strong> commission when your referred users refer others.</li>
                <li><strong>Level 3+:</strong> Earn a <strong>0.1%</strong> commission for all subsequent referral levels in your network.</li>
            </ul>
          </AlertDescription>
        </Alert>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Your Direct Referrals (Level 1)</CardTitle>
              <CardDescription>
                Track the status of users you've personally referred.
              </CardDescription>
            </div>
            <div className="text-right">
                <p className="text-sm text-muted-foreground">Level 1 Commission Earned</p>
                <p className="text-2xl font-bold">{formatCurrency(totalCommission)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Name</TableHead>
                <TableHead>Invested Capital</TableHead>
                <TableHead>Your Commission (5%)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : referredUsers.length > 0 ? (
                referredUsers.map((refUser) => (
                  <TableRow key={refUser.id}>
                    <TableCell className="font-medium">{refUser.name}</TableCell>
                    <TableCell>{formatCurrency(refUser.capital)}</TableCell>
                    <TableCell>{formatCurrency(refUser.commission)}</TableCell>
                    <TableCell>
                      <Badge variant={refUser.status === 'Active' ? 'default' : 'secondary'}>
                        {refUser.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        You have not referred any users yet.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

