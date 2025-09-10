
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
import { collection, onSnapshot, query, orderBy, doc } from "firebase/firestore";

interface DistributorTier {
  id: string;
  level: string;
  monthlyIncome: number;
  purchasedProducts: number;
  deposit: number;
}

interface DistributorData {
    referredUsersCount: number;
    userBalance: number;
}

export default function DistributorPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [distributorTiers, setDistributorTiers] = useState<DistributorTier[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [selectedTier, setSelectedTier] = useState<DistributorTier | null>(null);
  const [distributorData, setDistributorData] = useState<DistributorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "distributorTiers"), orderBy("deposit"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedTiers: DistributorTier[] = [];
        querySnapshot.forEach((doc) => {
            fetchedTiers.push({ id: doc.id, ...doc.data() } as DistributorTier);
        });
        setDistributorTiers(fetchedTiers);
        setLoadingTiers(false);
    }, (error) => {
        console.error("Error fetching tiers:", error);
        setLoadingTiers(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
        const userStatsRef = doc(db, "userStats", user.uid);
        const unsubscribe = onSnapshot(userStatsRef, (doc) => {
            if (doc.exists()) {
                 setDistributorData({
                    userBalance: doc.data().availableBalance || 0,
                    // In a real app, this would be a separate query.
                    referredUsersCount: 0,
                 });
            }
             setLoading(false);
        });
        return () => unsubscribe();
    }
  }, [user]);
  
  const handleApplyClick = (tier: DistributorTier) => {
    if (!distributorData || distributorData.userBalance < tier.deposit) {
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
        // --- Backend Logic Placeholder ---
        // Here you would call a backend function to:
        // 1. Deduct the deposit from the user's balance.
        // 2. Mark the user as having applied for the distributor level.
        // e.g., await applyForDistributor(user.uid, selectedTier.level);
        console.log(`Processing application for ${selectedTier.level}...`);
        

        toast({
          title: "Application Successful!",
          description: `You have applied for the ${selectedTier.level} distributor level. Your application is now pending approval.`,
        });

        // Optimistically update the UI or refetch data
        setDistributorData(prev => prev ? {...prev, userBalance: prev.userBalance - selectedTier.deposit} : null);

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

  const prerequisiteMet = (distributorData?.referredUsersCount ?? 0) >= 2;

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Golden Level Distributor Program</h1>
          <p className="text-muted-foreground">
            Apply to become a Golden Level distributor for monthly income opportunities.
          </p>
        </div>

        {!loading && !prerequisiteMet && (
          <Alert>
              <Users className="h-4 w-4" />
              <AlertTitle>Prerequisite Not Met</AlertTitle>
              <AlertDescription>
                  You must refer at least two users who have made an investment before you can apply to become a distributor.
              </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Golden Level Tiers</CardTitle>
            <CardDescription>
              Select a distributor level to apply for. A deposit is required and your application is subject to approval.
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
                ) : distributorTiers.map((tier) => (
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
                        disabled={loading || !prerequisiteMet}
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
                  Are you sure you want to apply for the <span className="font-bold">{selectedTier.level}</span> distributor level? The deposit of <span className="font-bold">{formatCurrency(selectedTier.deposit)}</span> will be deducted from your available balance. This action cannot be undone.
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
