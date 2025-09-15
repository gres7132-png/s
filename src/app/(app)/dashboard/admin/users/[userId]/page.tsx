
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, useCallback } from "react";
import { Activity, ArrowDown, ArrowUp, Ban, CheckCircle, DollarSign, Info, Loader2, Pencil, ShieldAlert, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { updateUserStatus } from "@/ai/flows/user-management";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { doc, getDoc, onSnapshot, collection, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { updateBalance, updateInvestment, deleteInvestment } from "@/ai/flows/admin-actions";
import { Skeleton } from "@/components/ui/skeleton";


// --- Data Interfaces ---
interface UserData {
  uid: string;
  email?: string;
  displayName?: string;
  disabled: boolean;
}

interface UserStats {
  availableBalance: number;
  todaysEarnings: number;
  rechargeAmount: number;
  withdrawalAmount: number;
}

const balanceSchema = z.object({
  availableBalance: z.coerce.number().min(0, "Balance cannot be negative."),
});
type BalanceFormValues = z.infer<typeof balanceSchema>;

const investmentSchema = z.object({
  price: z.coerce.number().positive(),
  dailyReturn: z.coerce.number().positive(),
  status: z.enum(["active", "completed"]),
});
type InvestmentFormValues = z.infer<typeof investmentSchema>;

interface Investment extends InvestmentFormValues {
    id: string;
    name: string;
    startDate: Timestamp;
    duration: number;
}


export default function UserDetailsPage({ params }: { params: { userId: string } }) {
  const { userId } = params;
  const { toast } = useToast();
  const { isAdmin, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);

  const balanceForm = useForm<BalanceFormValues>();
  const investmentForm = useForm<InvestmentFormValues>({ resolver: zodResolver(investmentSchema) });

  const fetchUserData = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
        const userDocRef = doc(db, "users", userId);
        // In a real app, this would be a backend call to get the user record from Firebase Auth
        // As a workaround, we'll optimistically update the state and revert on error.
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            const data = userDoc.data();
            setUser({ 
                uid: userDoc.id, 
                displayName: data.displayName,
                email: data.email,
                // The disabled status is managed optimistically in state
                // after an admin action, not fetched directly.
                disabled: user?.disabled || false,
            });
        } else {
             toast({ variant: "destructive", title: "User Not Found" });
        }
    } catch(e: any) {
        toast({ variant: "destructive", title: "Failed to fetch user data", description: e.message });
    } finally {
        setLoading(false);
    }
  }, [userId, toast, isAdmin, user?.disabled]);

  useEffect(() => {
    if (!isAdmin || !userId) return;

    fetchUserData();

    // Real-time listener for user stats
    const userStatsRef = doc(db, "userStats", userId);
    const unsubStats = onSnapshot(userStatsRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data() as UserStats;
            setStats(data);
            balanceForm.reset({ availableBalance: data.availableBalance || 0 });
        } else {
            setStats({ availableBalance: 0, todaysEarnings: 0, rechargeAmount: 0, withdrawalAmount: 0 });
        }
    });

    // Real-time listener for user investments
    const investmentsQuery = query(collection(db, `users/${userId}/investments`), orderBy("startDate", "desc"));
    const unsubInvestments = onSnapshot(investmentsQuery, (snapshot) => {
        const fetchedInvestments: Investment[] = [];
        snapshot.forEach(doc => {
            fetchedInvestments.push({ id: doc.id, ...doc.data() } as Investment);
        });
        setInvestments(fetchedInvestments);
    });

    return () => {
        unsubStats();
        unsubInvestments();
    };
  }, [userId, isAdmin, fetchUserData, balanceForm]);


  async function onBalanceSubmit(values: BalanceFormValues) {
    setActionLoading(true);
    try {
      await updateBalance({ userId, newBalance: values.availableBalance });
      toast({ title: "Balance Updated", description: "The user's balance has been successfully changed."});
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
    } finally {
      setActionLoading(false);
    }
  }

  const handleToggleSuspend = async () => {
    if (!user) return;
    setActionLoading(true);
    const newStatus = !user.disabled;
    try {
        await updateUserStatus({ uid: user.uid, disabled: newStatus });
        setUser(prev => prev ? {...prev, disabled: newStatus } : null);
        toast({
            title: `User ${newStatus ? 'Suspended' : 'Reactivated'}`,
            description: `${user.displayName || user.email} has been ${newStatus ? 'suspended' : 'reactivated'}.`
        });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Action Failed", description: error.message });
        setUser(prev => prev ? {...prev, disabled: !newStatus } : null); // Revert on error
    } finally {
        setActionLoading(false);
    }
  };

  const handleEditInvestment = (investment: Investment) => {
    setEditingInvestment(investment);
    investmentForm.reset({
      price: investment.price,
      dailyReturn: investment.dailyReturn,
      status: investment.status,
    });
  };

  const handleUpdateInvestment = async (values: InvestmentFormValues) => {
    if (!editingInvestment) return;
    setActionLoading(true);
    try {
      await updateInvestment({
        userId,
        investmentId: editingInvestment.id,
        ...values,
      });
      toast({ title: "Investment Updated" });
      setEditingInvestment(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteInvestment = async (investmentId: string) => {
     setActionLoading(true);
     try {
        await deleteInvestment({ userId, investmentId });
        toast({ title: "Investment Deleted" });
     } catch (e: any) {
        toast({ variant: "destructive", title: "Delete Failed", description: e.message });
     } finally {
        setActionLoading(false);
     }
  };

  const getInitials = (name?: string) => {
    return name ? name.split(' ').map(n => n[0]).join('') : 'U';
  }

  if (authLoading || loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!isAdmin) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <ShieldAlert className="h-12 w-12 text-destructive" />
            <h1 className="text-2xl font-bold mt-4">Access Denied</h1>
            <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
    );
  }

  return (
    <>
    <div className="space-y-8">
       {/* User Header */}
       <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2">
                <AvatarImage src={`https://avatar.vercel.sh/${user?.email}.png`} />
                <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
            </Avatar>
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    {user?.displayName || "Unnamed User"}
                    {user?.disabled && <Badge variant="destructive">Suspended</Badge>}
                </h1>
                <p className="text-muted-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground font-mono mt-1">{user?.uid}</p>
            </div>
            <div className="ml-auto">
                 <Button onClick={handleToggleSuspend} disabled={actionLoading} variant={user?.disabled ? "outline" : "destructive"}>
                    {actionLoading ? <Loader2 className="animate-spin" /> : (user?.disabled ? <><CheckCircle className="mr-2 h-4 w-4" />Reactivate</> : <><Ban className="mr-2 h-4 w-4" />Suspend</>)}
                 </Button>
            </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Admin Controls</AlertTitle>
          <AlertDescription>
              Changes made here directly affect the user's account and balance. Proceed with caution.
          </AlertDescription>
        </Alert>


        <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
                {/* Stats Cards */}
                <Card>
                    <CardHeader>
                        <CardTitle>Account Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center"><span className="text-muted-foreground">Today's Earnings</span><span className="font-bold">{stats ? formatCurrency(stats.todaysEarnings) : <Skeleton className="h-5 w-16" />}</span></div>
                        <div className="flex justify-between items-center"><span className="text-muted-foreground">Total Deposits</span><span className="font-bold">{stats ? formatCurrency(stats.rechargeAmount) : <Skeleton className="h-5 w-16" />}</span></div>
                        <div className="flex justify-between items-center"><span className="text-muted-foreground">Total Withdrawals</span><span className="font-bold">{stats ? formatCurrency(stats.withdrawalAmount) : <Skeleton className="h-5 w-16" />}</span></div>
                    </CardContent>
                </Card>

                 {/* Balance Form */}
                <Card>
                    <Form {...balanceForm}>
                        <form onSubmit={balanceForm.handleSubmit(onBalanceSubmit)}>
                            <CardHeader>
                                <CardTitle>Manage Balance</CardTitle>
                                <CardDescription>Directly edit the user's available balance.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <FormField control={balanceForm.control} name="availableBalance" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Available Balance (KES)</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input type="number" {...field} className="pl-8" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" disabled={actionLoading}>
                                    {actionLoading ? <Loader2 className="animate-spin" /> : "Save Balance"}
                                </Button>
                            </CardFooter>
                        </form>
                    </Form>
                </Card>
            </div>

            <div className="lg:col-span-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>User Investments</CardTitle>
                        <CardDescription>View and manage all active and completed investments for this user.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Daily Return</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {investments.length > 0 ? investments.map(inv => (
                                    <TableRow key={inv.id}>
                                        <TableCell className="font-medium">{inv.name}</TableCell>
                                        <TableCell>{formatCurrency(inv.price)}</TableCell>
                                        <TableCell>{formatCurrency(inv.dailyReturn)}</TableCell>
                                        <TableCell><Badge variant={inv.status === 'active' ? 'default' : 'secondary'}>{inv.status}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditInvestment(inv)}><Pencil className="h-4 w-4" /></Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the investment and cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleDeleteInvestment(inv.id)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No investments found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
    
     {/* Edit Investment Dialog */}
      <Dialog open={!!editingInvestment} onOpenChange={(open) => !open && setEditingInvestment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Investment: {editingInvestment?.name}</DialogTitle>
            <DialogDescription>
              Modify the properties of this investment. This will affect future earnings calculations.
            </DialogDescription>
          </DialogHeader>
          <Form {...investmentForm}>
            <form id="investment-edit-form" onSubmit={investmentForm.handleSubmit(handleUpdateInvestment)} className="space-y-4 py-4">
              <FormField control={investmentForm.control} name="price" render={({ field }) => (
                <FormItem><FormLabel>Price (KES)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={investmentForm.control} name="dailyReturn" render={({ field }) => (
                <FormItem><FormLabel>Daily Return (KES)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={investmentForm.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )} />
            </form>
          </Form>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingInvestment(null)}>Cancel</Button>
            <Button type="submit" form="investment-edit-form" disabled={actionLoading}>
              {actionLoading ? <Loader2 className="animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
  )
}
