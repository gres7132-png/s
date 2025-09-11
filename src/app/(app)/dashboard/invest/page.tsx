
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
import { db } from "@/lib/firebase";
import { doc, runTransaction, serverTimestamp, collection, addDoc, onSnapshot, query, orderBy, getDoc } from "firebase/firestore";

interface InvestmentPackage {
  id: string;
  name: string;
  price: number;
  dailyReturn: number;
  duration: number;
  totalReturn: number;
}

export default function InvestPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [silverLevelPackages, setSilverLevelPackages] = useState<InvestmentPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [userBalance, setUserBalance] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [isInvesting, setIsInvesting] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "silverLevelPackages"), orderBy("price"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedPackages: InvestmentPackage[] = [];
        querySnapshot.forEach((doc) => {
            fetchedPackages.push({ id: doc.id, ...doc.data() } as InvestmentPackage);
        });
        setSilverLevelPackages(fetchedPackages);
        setLoadingPackages(false);
    }, (error) => {
        console.error("Error fetching packages:", error);
        setLoadingPackages(false);
    });

    return () => unsubscribe();
  }, []);

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

  const handleInvestment = async (pkg: InvestmentPackage) => {
    if (!user) return toast({ variant: "destructive", title: "Not Authenticated" });
    if (userBalance < pkg.price) {
        toast({
            variant: "destructive",
            title: "Insufficient Funds",
            description: "Please make a deposit to invest in this package.",
        });
        return;
    }

    setIsInvesting(pkg.id);

    try {
      await runTransaction(db, async (transaction) => {
        const userStatsDocRef = doc(db, "userStats", user.uid);
        const earningsLogDocRef = doc(db, "earningsLog", user.uid);
        
        const userStatsDoc = await transaction.get(userStatsDocRef);
        const earningsLogDoc = await transaction.get(earningsLogDocRef);

        const currentBalance = userStatsDoc.exists() ? userStatsDoc.data().availableBalance : 0;
        if (currentBalance < pkg.price) {
          throw new Error("Insufficient funds.");
        }

        const newBalance = currentBalance - pkg.price;
        transaction.set(userStatsDocRef, { availableBalance: newBalance }, { merge: true });

        const investmentDocRef = collection(db, "users", user.uid, "investments");
        transaction.set(doc(investmentDocRef), {
            name: pkg.name,
            price: pkg.price,
            dailyReturn: pkg.dailyReturn,
            duration: pkg.duration,
            totalReturn: pkg.totalReturn,
            startDate: serverTimestamp(),
            status: "active",
        });

        // Create earnings log if it doesn't exist
        if (!earningsLogDoc.exists()) {
            transaction.set(earningsLogDocRef, { lastCalculated: new Date(0) }); // Set to epoch
        }
      });

      toast({
          title: "Investment Successful!",
          description: `You have invested in ${pkg.name}.`,
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
        {loadingPackages ? (
          Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-6"><Loader2 className="animate-spin"/></CardContent></Card>)
        ) : silverLevelPackages.map((pkg) => (
          <Card
            key={pkg.id}
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
                onClick={() => handleInvestment(pkg)}
                disabled={isLoadingBalance || isInvesting === pkg.id}
              >
                {isInvesting === pkg.id ? <Loader2 className="animate-spin" /> : "Invest Now"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {!loadingPackages && silverLevelPackages.length === 0 && (
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

    