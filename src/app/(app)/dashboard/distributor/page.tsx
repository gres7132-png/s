
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
import { Users, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { applyForContributorTier } from "@/ai/flows/user-management";
import { getContributorData, ContributorData } from "@/ai/flows/get-user-data";

interface ContributorTier {
  id: string;
  level: string;
  monthlyIncome: number;
  purchasedProducts: number;
  deposit: number;
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
        getContributorData()
            .then(data => {
                setContributorData(data);
            })
            .catch(err => {
                console.error("Failed to get contributor data:", err);
                // Fail silently as requested. The UI will just show buttons as disabled.
                setContributorData(null);
            })
            .finally(() => {
                setLoadingData(false);
            });
    }
  }, [user]);
  
  const handleApplyClick = (tier: ContributorTier) => {
    if (!contributorData || contributorData.userBalance < tier.deposit) {
      toast({
        variant: "destructive",
        title: "Insufficient Funds",
        description: `You need at least ${formatCurrency(tier.deposit)} to apply. Please make a deposit.`,
      });
    } else {
      setSelectedTier(tier);
    }
  };

  const handleConfirmApply = async () => {
    if (!selectedTier || !user) return;

    setIsApplying(true);
    
    try {
        await applyForContributorTier({
            tierId: selectedTier.id,
            tierLevel: selectedTier.level,
            depositAmount: selectedTier.deposit
        });
        
        toast({
          title: "Application Successful!",
          description: `You have applied for the ${selectedTier.level} contributor level. Your deposit has been deducted and your application is now pending approval.`,
        });

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Application Failed",
            description: error.message || "Could not process your application. Please try again.",
        });
    } finally {
        setIsApplying(false);
        setSelectedTier(null);
    }
  };

  const handleCancelApply = () => {
    setSelectedTier(null);
  };

  const prerequisiteMet = contributorData ? contributorData.activeReferralsCount >= 2 : false;

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Golden Level Contributor Program</h1>
          <p className="text-muted-foreground">
            Apply to become a Golden Level contributor for monthly income opportunities.
          </p>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Important Notice</AlertTitle>
          <AlertDescription>
            Due to app maintenance you may experience challenges. In case of any challenges kindly <a href="https://chat.whatsapp.com/CUTtFWsav7M4OQyJEgUHlJ?mode=ems_wa_t" target="_blank" rel="noopener noreferrer" className="font-bold underline">contact support</a>.
          </AlertDescription>
        </Alert>

        {loadingData ? (
           <Skeleton className="h-16 w-full" />
        ) : !prerequisiteMet && (
          <Alert>
              <Users className="h-4 w-4" />
              <AlertTitle>Prerequisite Not Met</AlertTitle>
              <AlertDescription>
                  You must refer at least two users who have made an investment before you can apply to become a contributor. You currently have {contributorData?.activeReferralsCount ?? 0} active referral(s).
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
                        disabled={loadingData || !prerequisiteMet || isApplying}
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
        <AlertDialog open onOpenChange={(open) => !open && handleCancelApply()}>
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
