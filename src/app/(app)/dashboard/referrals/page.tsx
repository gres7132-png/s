
"use client";

import { useEffect, useState } from "react";
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
import { Copy, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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

  useEffect(() => {
    if (user) {
      setReferralLink(`${window.location.origin}/auth?ref=${user.uid}`);
      
      // --- Backend Data Fetching Placeholder ---
      const fetchReferredUsers = async () => {
        setLoading(true);
        // Example: const users = await getReferredUsers(user.uid);
        // setReferredUsers(users);
        setReferredUsers([]); // A new user starts with an empty list of referrals.
        setLoading(false);
      };
      fetchReferredUsers();
    }
  }, [user]);

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
          Earn a 5% commission for every new user you refer who invests.
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
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Your Referrals</CardTitle>
              <CardDescription>
                Track the status of your referred users and your commissions.
              </CardDescription>
            </div>
            <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Commission Earned</p>
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
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
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
