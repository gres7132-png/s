
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { silverLevelPackages } from "@/lib/config";
import { db } from "@/lib/firebase";
import { doc, runTransaction, serverTimestamp, collection, addDoc, onSnapshot } from "firebase/firestore";

export default function InvestPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [userBalance, setUserBalance] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [isInvesting, setIsInvesting] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const userStatsDocRef = doc(db, "userStats", user.uid);
      const unsubscribe = onSnapshot(userStatsDocRef, (doc) => {
        if (doc.exists()) {
          setUserBalance(doc.data().availableBalance || 0);
        } else {
          setUserBalance(0);
        }
        setIsLoadingBalance(false);
      }, (error) => {
        console.error("Error fetching user balance:", error);
        setIsLoadingBalance(false);
      });
      
      return () => unsubscribe();
    }
  }, [user]);

  const handleInvestment = async (packageName: string, price: number, dailyReturn: number, duration: number, totalReturn: number) => {
    if (!user) return toast({ variant: "destructive", title: "Not Authenticated" });
    if (userBalance < price) {
        toast({
            variant: "destructive",
            title: "Insufficient Funds",
            description: "Please make a deposit to invest in this package.",
        });
        return;
    }

    setIsInvesting(packageName);

    try {
      await runTransaction(db, async (transaction) => {
        const userStatsDocRef = doc(db, "userStats", user.uid);
        const userStatsDoc = await transaction.get(userStatsDocRef);

        const currentBalance = userStatsDoc.exists() ? userStatsDoc.data().availableBalance : 0;
        if (currentBalance < price) {
          throw new Error("Insufficient funds.");
        }

        const newBalance = currentBalance - price;
        transaction.set(userStatsDocRef, { availableBalance: newBalance }, { merge: true });

        const investmentDocRef = collection(db, "users", user.uid, "investments");
        transaction.set(doc(investmentDocRef), {
            name: packageName,
            price,
            dailyReturn,
            duration,
            totalReturn,
            startDate: serverTimestamp(),
            status: "active",
        });
      });

      toast({
          title: "Investment Successful!",
          description: `You have invested in ${packageName}.`,
      });

    } catch (error: any) {
       toast({
            variant: "destructive",
            title: "Investment Failed",
            description: error.message || "Could not process your investment. Please try again.",
        });
    } finally {
        setIsInvesting(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Product Center</h1>
        <p className="text-muted-foreground">
          Invest in a Silver Level package to start earning daily.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {silverLevelPackages.map((pkg) => (
          <Card
            key={pkg.name}
            className="flex flex-col transform hover:scale-105 transition-transform duration-300"
          >
            <CardHeader>
              <CardTitle>{pkg.name}</CardTitle>
              <CardDescription>
                Invest {formatCurrency(pkg.price)}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4 text-sm">
                <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">Daily Return</span>
                    <span className="font-bold text-lg text-primary">{formatCurrency(pkg.dailyReturn)}</span>
                </div>
                 <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-semibold">{pkg.duration} Days</span>
                </div>
                 <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">Total Earnings</span>
                    <span className="font-bold text-accent">{formatCurrency(pkg.totalReturn)}</span>
                </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-foreground text-background hover:bg-foreground/90"
                onClick={() => handleInvestment(pkg.name, pkg.price, pkg.dailyReturn, pkg.duration, pkg.totalReturn)}
                disabled={isLoadingBalance || isInvesting === pkg.name}
              >
                {isInvesting === pkg.name ? <Loader2 className="animate-spin" /> : "Invest Now"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {silverLevelPackages.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Investment packages will be available soon. Please check back later.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
