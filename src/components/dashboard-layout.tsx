

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  User,
  LogOut,
  Briefcase,
  DollarSign,
  UserPlus,
  Gift,
  TrendingUp,
  Shield,
  LifeBuoy,
  Globe,
  List,
  ShieldCheck,
  Bot,
} from "lucide-react";

import { signOut } from "firebase/auth";
import { useAuth } from "@/hooks/use-auth";

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
  SidebarGroup,
  SidebarFooter,
  SidebarSeparator,
  SidebarMenuBadge,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "./ui/button";
import { Logo } from "./logo";
import type { ReactNode } from "react";
import { Skeleton } from "./ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/invest", icon: Briefcase, label: "Product Center" },
  { href: "/dashboard/wallet", icon: Wallet, label: "Withdraw/Deposit" },
  { href: "/dashboard/yield-projections", icon: TrendingUp, label: "Yield Projections"},
  { href: "/dashboard/referrals", icon: UserPlus, label: "Referral Program" },
  { href: "/dashboard/distributor", icon: Gift, label: "Contributor Program" },
  { href: "/dashboard/commissions", icon: DollarSign, label: "Agent Commissions" },
  { href: "/dashboard/assistant", icon: Bot, label: "Virtual Assistant", iconClassName: "bot-icon" },
];

const adminNavItems = [
    { href: "/dashboard/admin", icon: Shield, label: "Admin Dashboard" },
    { href: "/dashboard/admin/users", icon: User, label: "Manage Users" },
    { href: "/dashboard/admin/transactions", icon: List, label: "Transactions" },
];

function NavMenu() {
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();
  const router = useRouter();
  const { auth, isAdmin } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;

    const pendingDepositsQuery = query(collection(db, "transactionProofs"), where("status", "==", "pending"));
    const pendingWithdrawalsQuery = query(collection(db, "withdrawalRequests"), where("status", "==", "pending"));

    let depositCount = 0;
    let withdrawalCount = 0;

    const updateCounts = () => {
      setPendingCount(depositCount + withdrawalCount);
    };

    const unsubDeposits = onSnapshot(pendingDepositsQuery, (snapshot) => {
        depositCount = snapshot.size;
        updateCounts();
    });

    const unsubWithdrawals = onSnapshot(pendingWithdrawalsQuery, (snapshot) => {
        withdrawalCount = snapshot.size;
        updateCounts();
    });

    return () => {
      unsubDeposits();
      unsubWithdrawals();
    };
  }, [isAdmin]);

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/auth");
  };

  return (
    <>
      <SidebarMenu>
        {navItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={pathname.startsWith(item.href) && (item.href === '/dashboard' ? pathname === item.href : true)}
              tooltip={item.label}
              onClick={handleLinkClick}
            >
              <Link href={item.href}>
                <item.icon className={item.iconClassName} />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
        
        {isAdmin && (
            <>
                <SidebarSeparator className="my-2" />
                 {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith(item.href) && (item.href === '/dashboard/admin' ? pathname === item.href : true)}
                      tooltip={item.label}
                      onClick={handleLinkClick}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                     {item.href === "/dashboard/admin/transactions" && pendingCount > 0 && (
                        <SidebarMenuBadge>{pendingCount}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
            </>
        )}
      </SidebarMenu>

      <SidebarFooter className="mt-auto">
        <SidebarMenu>
           <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Support"
            >
              <a href="https://chat.whatsapp.com/CUTtFWsav7M4OQyJEgUHlJ?mode=ems_wa_t" target="_blank" rel="noopener noreferrer">
                <LifeBuoy />
                <span>Support</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
             <SidebarMenuButton onClick={handleLogout} tooltip="Log Out">
                <LogOut />
                <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  )
}

function UserProfileNav() {
    const { user, loading, auth, isAdmin, emailVerified } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await signOut(auth);
        router.push("/auth");
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-9 rounded-full" />
            </div>
        )
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.photoURL ?? `https://avatar.vercel.sh/${user?.email}.png`} data-ai-hint="person avatar" alt={user?.displayName ?? "User"} />
                  <AvatarFallback>{user?.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium leading-none">{user?.displayName ?? 'User'}</p>
                    {isAdmin && <Badge variant="secondary">Admin</Badge>}
                    {emailVerified && <Badge variant="default">Verified</Badge>}
                  </div>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
               <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <span>Theme</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <ThemeToggle />
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
    )
}

function UserInfo() {
    const { user, loading: authLoading } = useAuth();
    const [userInfo, setUserInfo] = useState<{ phoneNumber?: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      if (user) {
        setLoading(true);
        const userDocRef = doc(db, "users", user.uid);
        const unsubscribe = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            setUserInfo({ phoneNumber: doc.data().phoneNumber });
          }
          setLoading(false);
        });
        return () => unsubscribe();
      } else {
        setLoading(false);
      }
    }, [user]);

    if (authLoading || loading) {
        return (
            <div className="p-2 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
            </div>
        )
    }
    
    const displayId = user?.uid.substring(0, 5).toUpperCase() ?? 'N/A';

    return (
        <div className="p-2 text-sm">
            <div className="font-bold text-sidebar-foreground">
                ID: {displayId}
            </div>
            <div className="text-muted-foreground">
                {userInfo?.phoneNumber || "No phone number"}
            </div>
        </div>
    )
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Logo className="w-6 h-6 text-primary" />
            <span className="text-lg font-semibold text-primary">YieldLink</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
            <SidebarGroup>
                <UserInfo />
            </SidebarGroup>
          <NavMenu />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center justify-between lg:justify-end gap-2 border-b px-4 lg:px-6">
          <SidebarTrigger className="lg:hidden h-12 w-12 [&>svg]:h-8 [&>svg]:w-8" />
          <Button variant="outline" size="sm" asChild>
              <Link href="/website">
                <Globe />
                <span>Go to Website</span>
              </Link>
          </Button>
          <UserProfileNav />
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
