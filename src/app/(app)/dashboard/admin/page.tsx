
"use client";

import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, List, Briefcase, Settings, ShieldAlert, DollarSign, Gift } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If the user is not loading and is not an admin, redirect them.
    if (!loading && !isAdmin) {
      router.push("/dashboard");
    }
  }, [isAdmin, loading, router]);
  
  // While loading, we can show a skeleton or nothing to prevent content flash
  if (loading || !isAdmin) {
    return (
        <div className="flex items-center justify-center h-full">
            <ShieldAlert className="h-8 w-8 text-muted-foreground animate-pulse" />
        </div>
    );
  }

  const adminSections = [
    { 
      href: "/dashboard/admin/investments", 
      title: "Investment Packages", 
      description: "Add or modify investment products.",
      icon: Briefcase,
    },
    { 
      href: "/dashboard/admin/distributor", 
      title: "Distributor Tiers",
      description: "Manage distributor levels and deposits.",
      icon: Gift
    },
    {
      href: "/dashboard/admin/commissions",
      title: "Commission Tiers",
      description: "Set agent commission levels.",
      icon: DollarSign
    },
    {
        href: "#",
        title: "Manage Users",
        description: "View, edit, or suspend user accounts.",
        icon: Users
    },
    {
        href: "#",
        title: "All Transactions",
        description: "Review all deposits and withdrawals.",
        icon: List
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
        <p className="text-muted-foreground">
          Manage your platform's users, transactions, and settings.
        </p>
      </div>

      <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Admin Access Only</AlertTitle>
          <AlertDescription>
              You are viewing this page as an administrator. Changes made here can have a major impact on the application.
          </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {adminSections.map((section) => (
           <Link href={section.href} key={section.title}>
            <Card className="hover:border-primary/50 hover:bg-muted/50 transition-all h-full">
              <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <section.icon className="h-6 w-6 text-muted-foreground mt-1" />
                <div className="space-y-1">
                    <CardTitle className="text-base font-semibold">{section.title}</CardTitle>
                    <CardDescription className="text-xs">{section.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
           </Link>
        ))}
      </div>
    </div>
  );
}
