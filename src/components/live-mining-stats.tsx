"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Cpu, Archive, Thermometer } from "lucide-react";
import { Skeleton } from './ui/skeleton';

interface MiningStats {
    hashrate: number;
    activeRigs: number;
    blocksFound: number;
    powerUsage: number;
}

export default function LiveMiningStats() {
    const [stats, setStats] = useState<MiningStats | null>(null);
    const [loading, setLoading] = useState(true);

    // Initial base values
    const baseHashrate = 785; // in PH/s
    const baseRigs = 2500;
    const baseBlocks = 8;
    const basePower = 150; // in MW

    useEffect(() => {
        // Set initial values slightly randomized on component mount
        setStats({
            hashrate: baseHashrate + (Math.random() - 0.5) * 10,
            activeRigs: baseRigs + Math.floor((Math.random() - 0.5) * 20),
            blocksFound: baseBlocks,
            powerUsage: basePower + (Math.random() - 0.5) * 5,
        });
        setLoading(false);

        const interval = setInterval(() => {
            setStats(prevStats => {
                if (!prevStats) return null;

                // Hashrate fluctuates more rapidly
                const newHashrate = baseHashrate + (Math.random() - 0.5) * 10;
                
                // Rigs fluctuate less often
                const newActiveRigs = Math.random() < 0.1 
                    ? baseRigs + Math.floor((Math.random() - 0.5) * 20) 
                    : prevStats.activeRigs;

                // Blocks found increments occasionally
                const newBlocksFound = Math.random() < 0.05 
                    ? prevStats.blocksFound + 1 
                    : prevStats.blocksFound;
                
                // Power usage fluctuates slightly
                const newPowerUsage = basePower + (Math.random() - 0.5) * 5;

                return {
                    hashrate: newHashrate,
                    activeRigs: newActiveRigs,
                    blocksFound: newBlocksFound,
                    powerUsage: newPowerUsage
                };
            });
        }, 2500); // Update every 2.5 seconds

        return () => clearInterval(interval);
    }, []);

    const StatCard = ({ icon, title, value, unit, isLoading }: { icon: React.ReactNode, title: string, value: number | undefined, unit: string, isLoading: boolean }) => (
        <Card className="bg-muted/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                {isLoading || value === undefined ? (
                    <Skeleton className="h-8 w-3/4" />
                ) : (
                    <div className="text-2xl font-bold">
                        {value.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    return (
        <section className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4">
                <div className="text-center space-y-4 mb-12">
                     <h2 className="text-3xl font-bold tracking-tight">Live Mining Operations</h2>
                     <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                        A real-time overview of our global mining fleet's performance. These metrics demonstrate the scale and efficiency of our operations.
                     </p>
                 </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard 
                        icon={<Zap className="h-5 w-5 text-muted-foreground" />}
                        title="Total Hashrate"
                        value={stats?.hashrate}
                        unit="PH/s"
                        isLoading={loading}
                    />
                    <StatCard 
                        icon={<Cpu className="h-5 w-5 text-muted-foreground" />}
                        title="Active Mining Rigs"
                        value={stats?.activeRigs}
                        unit="Units"
                        isLoading={loading}
                    />
                    <StatCard 
                        icon={<Archive className="h-5 w-5 text-muted-foreground" />}
                        title="Blocks Found Today"
                        value={stats?.blocksFound}
                        unit="Blocks"
                        isLoading={loading}
                    />
                    <StatCard 
                        icon={<Thermometer className="h-5 w-5 text-muted-foreground" />}
                        title="Power Consumption"
                        value={stats?.powerUsage}
                        unit="MW"
                        isLoading={loading}
                    />
                </div>
            </div>
        </section>
    );
}
