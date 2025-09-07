
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

interface ChartData {
  month: string;
  earnings: number;
}

const chartConfig = {
  earnings: {
    label: "Earnings ($)",
    color: "hsl(var(--primary))",
  },
}

export default function YieldProjectionsPage() {
  const { user } = useAuth();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
        // --- Backend Data Fetching Placeholder ---
        const fetchProjections = async () => {
            setLoading(true);
            // In a real application, you would call your backend to calculate projections
            // based on the user's current investments.
            // Example: const data = await getYieldProjections(user.uid);
            
            setChartData([]); // A new user starts with no projection data.
            setLoading(false);
        };
        fetchProjections();
    }
  }, [user]);


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Yield Projections</h1>
        <p className="text-muted-foreground">
          Visualize your potential earnings over time.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projected Monthly Earnings</CardTitle>
          <CardDescription>
            Based on your current investments and market trends.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {loading ? (
                 <div className="min-h-[300px] flex items-center justify-center">
                    <Skeleton className="h-[250px] w-full" />
                 </div>
            ) : chartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                    <BarChart accessibilityLayer data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="month"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                    />
                    <YAxis
                      tickFormatter={(value) => `$${value}`}
                    />
                    <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                    />
                    <Bar dataKey="earnings" fill="var(--color-earnings)" radius={4} />
                    </BarChart>
                </ChartContainer>
            ) : (
                <div className="min-h-[300px] flex items-center justify-center">
                    <p className="text-muted-foreground">
                        Make an investment to see your yield projections.
                    </p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  )
}
