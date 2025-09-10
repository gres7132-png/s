
"use client"

import { useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useAuth } from "@/hooks/use-auth"
import { Skeleton } from "@/components/ui/skeleton"
import { collection, onSnapshot, query, where, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { addMonths, format, startOfMonth } from 'date-fns';
import { formatCurrency } from "@/lib/utils"

interface Investment {
  id: string;
  name: string;
  price: number;
  dailyReturn: number;
  duration: number;
  totalReturn: number;
  startDate: Timestamp;
  status: 'active' | 'completed';
}

interface ChartData {
  month: string;
  earnings: number;
}

const chartConfig = {
  earnings: {
    label: "Earnings (KES)",
    color: "hsl(var(--primary))",
  },
}

export default function YieldProjectionsPage() {
  const { user } = useAuth();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const investmentsQuery = query(
        collection(db, "users", user.uid, "investments"),
        where("status", "==", "active")
      );

      const unsubscribe = onSnapshot(investmentsQuery, (snapshot) => {
        setLoading(true);
        const activeInvestments: Investment[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Investment));
        
        if (activeInvestments.length > 0) {
            const monthlyProjections: {[key: string]: number} = {};
            const totalDailyReturn = activeInvestments.reduce((sum, inv) => sum + inv.dailyReturn, 0);

            const now = new Date();
            for (let i = 0; i < 6; i++) {
                const futureMonthDate = addMonths(now, i);
                const monthKey = format(futureMonthDate, 'MMM');
                // Simple projection: daily return * 30 days
                monthlyProjections[monthKey] = (monthlyProjections[monthKey] || 0) + (totalDailyReturn * 30);
            }

            const formattedChartData = Object.entries(monthlyProjections).map(([month, earnings]) => ({
                month,
                earnings: Math.round(earnings)
            }));
            
            setChartData(formattedChartData);
        } else {
            setChartData([]);
        }

        setLoading(false);
      }, (error) => {
        console.error("Error fetching projections:", error);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [user]);


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Yield Projections</h1>
        <p className="text-muted-foreground">
          Visualize your potential earnings over time based on your active investments.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projected Monthly Earnings</CardTitle>
          <CardDescription>
            A 6-month forecast based on your current daily returns.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {loading ? (
                 <div className="min-h-[300px] flex items-center justify-center">
                    <Skeleton className="h-[250px] w-full" />
                 </div>
            ) : chartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                    <BarChart accessibilityLayer data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="month"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                    />
                    <YAxis
                      tickFormatter={(value) => {
                        if (value >= 1000) {
                            return `KES ${value / 1000}k`;
                        }
                        return `KES ${value}`;
                      }}
                    />
                    <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" formatter={(value, name, props) => {
                            return (
                                <div className="flex flex-col gap-0.5">
                                    <span className="font-medium text-foreground">{formatCurrency(value as number)}</span>
                                    <span className="text-muted-foreground text-xs capitalize">{name}</span>
                                </div>
                            )
                        }} />}
                    />
                    <Bar dataKey="earnings" fill="var(--color-earnings)" radius={4} />
                    </BarChart>
                </ChartContainer>
            ) : (
                <div className="min-h-[300px] flex flex-col gap-4 items-center justify-center text-center">
                    <p className="text-muted-foreground font-medium">
                        No active investments found.
                    </p>
                    <p className="text-sm text-muted-foreground max-w-xs">
                        Make an investment from the Product Center to see your personalized yield projections here.
                    </p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  )
}
