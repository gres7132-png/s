
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, doc, where } from "firebase/firestore";

interface ContributorTier {
  id: string;
  level: string;
  monthlyIncome: number;
  purchasedProducts: number;
  deposit: number;
}

interface ContributorData {
    activeReferralsCount: number;
    userBalance: number;
}

export default function DistributorPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [contributorTiers, setContributorTiers] = useState<ContributorTier[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [selectedTier, setSelectedTier] = useState<ContributorTier | null>(null);
  const [contributorData, setContributorData] = useState<ContributorData | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "contributorTiers"), orderBy("deposit"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedTiers: ContributorTier[] = [];
        querySnapshot.forEach((doc) => {
            fetchedTiers.push({ id: doc.id, ...doc.data() } as ContributorTier);
        });
        setContributorTiers(fetchedTiers);
        setLoadingTiers(false);
    }, (error) => {
        console.error("Error fetching tiers:", error);
        setLoadingTiers(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
        setLoadingData(true);
        const userStatsRef = doc(db, "userStats", user.uid);
        
        const unsubStats = onSnapshot(userStatsRef, (doc) => {
            setContributorData(prev => ({
                ...prev,
                userBalance: doc.exists() ? doc.data().availableBalance || 0 : 0,
                activeReferralsCount: prev?.activeReferralsCount || 0,
            }));
        });

        // Efficiently query for users who were referred by the current user and have active investments.
        const referralsQuery = query(
            collection(db, "users"),
            where("referredBy", "==", user.uid),
            where("hasActiveInvestment", "==", true)
        );
      
        const unsubReferrals = onSnapshot(referralsQuery, (snapshot) => {
            setContributorData(prev => ({
                 ...prev,
                userBalance: prev?.userBalance || 0,
                activeReferralsCount: snapshot.size,
            }));
            setLoadingData(false);
        }, (error) => {
            console.error("Error fetching active referrals:", error);
            setLoadingData(false);
        });
        
        return () => {
            unsubStats();
            unsubReferrals();
        };
    }
  }, [user]);
  
  const handleApplyClick = (tier: ContributorTier) => {
    if (!contributorData || contributorData.userBalance < tier.deposit) {
      toast({
        variant: "destructive",
        title: "Insufficient Funds",
        description: "Please make a deposit to apply for this level.",
      });
    } else {
      setSelectedTier(tier);
    }
  };

  const handleConfirmApply = async () => {
    if (!selectedTier || !user) return;

    setIsApplying(true);
    
    try {
        // This is a placeholder. In a real application, this would trigger a secure backend flow.
        console.log(`Processing application for ${selectedTier.level}...`);
        
        toast({
          title: "Application Successful!",
          description: `You have applied for the ${selectedTier.level} contributor level. Your application is now pending approval.`,
        });

        // Optimistically update the UI or refetch data
        setContributorData(prev => prev ? {...prev, userBalance: prev.userBalance - selectedTier.deposit} : null);

    } catch (error) {
        toast({
            variant: "destructive",
            title: "Application Failed",
            description: "Could not process your application. Please try again.",
        });
    } finally {
        setIsApplying(false);
        setSelectedTier(null);
    }
  };

  const handleCancelApply = () => {
    setSelectedTier(null);
  };

  const prerequisiteMet = (contributorData?.activeReferralsCount ?? 0) >= 2;

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Golden Level Contributor Program</h1>
          <p className="text-muted-foreground">
            Apply to become a Golden Level contributor for monthly income opportunities.
          </p>
        </div>

        {loadingData ? (
           <Skeleton className="h-16 w-full" />
        ) : !prerequisiteMet && (
          <Alert>
              <Users className="h-4 w-4" />
              <AlertTitle>Prerequisite Not Met</AlertTitle>
              <AlertDescription>
                  You must refer at least two users who have made an investment before you can apply to become a contributor. You currently have {contributorData?.activeReferralsCount} active referral(s).
              </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Golden Level Tiers</CardTitle>
            <CardDescription>
              Select a contributor level to apply for. A deposit is required and your application is subject to approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Level</TableHead>
                  <TableHead>Est. Monthly Income</TableHead>
                  <TableHead>Required Products</TableHead>
                  <TableHead>Deposit</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingTiers ? (
                    <TableRow><TableCell colSpan={5} className="text-center"><Loader2 className="animate-spin"/></TableCell></TableRow>
                ) : contributorTiers.map((tier) => (
                  <TableRow key={tier.level}>
                    <TableCell className="font-medium">
                      <Badge variant="secondary">{tier.level}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(tier.monthlyIncome)}</TableCell>
                    <TableCell>{tier.purchasedProducts}</TableCell>
                    <TableCell>{formatCurrency(tier.deposit)}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={loadingData || !prerequisiteMet}
                        onClick={() => handleApplyClick(tier)}
                      >
                        Apply
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
      {selectedTier && (
        <AlertDialog open onOpenChange={handleCancelApply}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Application</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to apply for the <span className="font-bold">{selectedTier.level}</span> contributor level? The deposit of <span className="font-bold">{formatCurrency(selectedTier.deposit)}</span> will be deducted from your available balance. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={handleCancelApply} disabled={isApplying}>
                    Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmApply} disabled={isApplying}>
                  {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isApplying ? "Applying..." : "Confirm & Apply"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
