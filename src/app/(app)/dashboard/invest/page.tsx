

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
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { investPackage } from "@/ai/flows/user-management";

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

  const handleInvestment = async (pkg: InvestmentPackage) => {
    if (!user) return toast({ variant: "destructive", title: "Not Authenticated" });
    
    setIsInvesting(pkg.id);

    try {
      await investPackage({ packageId: pkg.id });

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
                disabled={isInvesting === pkg.id || loadingPackages}
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
