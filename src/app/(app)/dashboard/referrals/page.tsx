
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
import { Copy, Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { getReferralData, ReferralData } from "@/ai/flows/get-user-data";

export default function ReferralsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [referralLink, setReferralLink] = useState("");
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setReferralLink(`${window.location.origin}/auth?ref=${user.uid}`);
      
      const fetchReferralData = async () => {
        try {
          const data = await getReferralData();
          setReferralData(data);
        } catch (err: any) {
          console.error("Failed to get referral data:", err);
          // Gracefully fail by setting empty data, do not show error toast.
          setReferralData({ referredUsers: [], totalCommissionEarned: 0 });
        } finally {
            setLoading(false);
        }
      }
      fetchReferralData();
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
  
  const referredUsers = referralData?.referredUsers || [];
  const totalCommission = referralData?.totalCommissionEarned || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Referral Program</h1>
        <p className="text-muted-foreground">
          Earn commissions from your network's investments.
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
          <div className="flex items-center gap-2">
            <Input 
              readOnly 
              value={referralLink || "Loading your link..."}
              className="flex-grow bg-muted"
            />
            <Button size="icon" variant="outline" onClick={copyToClipboard} disabled={!referralLink}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

       <Alert>
          <Users className="h-4 w-4" />
          <AlertTitle>Commission Structure</AlertTitle>
          <AlertDescription>
            <p className="mt-2">
                You earn a <strong>5%</strong> commission on the total amount deposited by users you directly refer. The commission is automatically added to your available balance each time their deposit is approved by an administrator.
            </p>
          </AlertDescription>
        </Alert>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Your Direct Referrals</CardTitle>
              <CardDescription>
                Track the status and total invested capital of users you've personally referred.
              </CardDescription>
            </div>
             <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Commission (Deprecated)</p>
                <p className="text-2xl font-bold text-muted-foreground line-through">{loading ? <Loader2 className="animate-spin" /> : formatCurrency(totalCommission)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Name</TableHead>
                <TableHead>Total Invested Capital</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : referredUsers.length > 0 ? (
                referredUsers.map((refUser) => (
                  <TableRow key={refUser.id}>
                    <TableCell className="font-medium">{refUser.displayName}</TableCell>
                    <TableCell>{formatCurrency(refUser.capital)}</TableCell>
                    <TableCell>
                      <Badge variant={refUser.status === 'Active' ? 'default' : 'secondary'}>
                        {refUser.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
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
