

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
import { Ban, CheckCircle, Info, Loader2, Pencil, ShieldAlert, Trash2, Wallet } from "lucide-react";
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
import { updateUserStatus, listAllUsers, UserData } from "@/ai/flows/user-management";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, Timestamp } from "firebase/firestore";
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


const bankingDetailsSchema = z.object({
    paymentMethod: z.enum(["mobile", "crypto", "minipay"], { required_error: "Please select a payment method." }),
    mobileNumber: z.string().optional(),
    minipayNumber: z.string().optional(),
    cryptoCurrency: z.enum(["BTC", "ETH", "USDT"]).optional(),
    cryptoAddress: z.string().optional(),
}).refine(data => {
    if (data.paymentMethod === "mobile") return !!data.mobileNumber && data.mobileNumber.length > 0;
    if (data.paymentMethod === "minipay") return !!data.minipayNumber && data.minipayNumber.length > 0;
    if (data.paymentMethod === "crypto") return !!data.cryptoCurrency && !!data.cryptoAddress && data.cryptoAddress.length > 0;
    return true;
}, {
    message: "Please fill in the required details for the selected payment method.",
    path: ["paymentMethod"],
});

type BankingDetailsFormValues = z.infer<typeof bankingDetailsSchema>;

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
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);

  const balanceForm = useForm<BalanceFormValues>();
  const investmentForm = useForm<InvestmentFormValues>({ resolver: zodResolver(investmentSchema) });

  const fetchUserData = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
        const { users } = await listAllUsers();
        const currentUser = users.find(u => u.uid === userId);
        if (currentUser) {
            setUser(currentUser);
        } else {
             toast({ variant: "destructive", title: "User Not Found" });
        }
    } catch(e: any) {
        toast({ variant: "destructive", title: "Failed to fetch user data", description: e.message });
    } finally {
        setLoading(false);
    }
  }, [userId, toast, isAdmin]);

  useEffect(() => {
    if (!isAdmin || !userId) return;

    fetchUserData();

    const userStatsRef = doc(db, "userStats", userId);
    const unsubStats = onSnapshot(userStatsRef, (doc) => {
        if (doc.exists()) {
            balanceForm.reset({ availableBalance: doc.data().availableBalance || 0 });
        }
    });

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
        toast({ variant: "destructive", title: "Deletion Failed", description: e.message });
    } finally {
        setActionLoading(false);
    }
  };


  if (authLoading || loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!isAdmin) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <ShieldAlert className="h-12 w-12 text-destructive" />
            <h1 className="text-2xl font-bold mt-4">Access Denied</h1>
        </div>
    );
  }

  if (!user) {
     return (
        <div className="space-y-4 text-center pt-8">
            <Alert variant="destructive" className="max-w-md mx-auto">
                <Info className="h-4 w-4" />
                <AlertTitle>User Data Not Found</AlertTitle>
                <AlertDescription>
                   Could not load data for this user. They may not exist or there may be an issue with your configuration.
                </AlertDescription>
            </Alert>
        </div>
     );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage User: {user.displayName}</h1>
        <p className="text-muted-foreground">
          View and edit user details, account status, and activity.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-8">
          <Card>
            <CardHeader>
                <CardTitle>User Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                    <AvatarImage src={`https://avatar.vercel.sh/${user?.email}.png`} data-ai-hint="person face" />
                    <AvatarFallback>{user?.displayName?.charAt(0) ?? "U"}</AvatarFallback>
                </Avatar>
                 <div className="space-y-1">
                    <p className="font-semibold">{user.displayName}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <Badge variant={user.disabled ? 'destructive' : 'default'}>
                        {user.disabled ? 'Suspended' : 'Active'}
                    </Badge>
                 </div>
                </div>
            </CardContent>
          </Card>
          
           <Card>
             <Form {...balanceForm}>
                <form onSubmit={balanceForm.handleSubmit(onBalanceSubmit)}>
                  <CardHeader>
                      <CardTitle>Account Stats</CardTitle>
                      <CardDescription>Directly modify the user's available balance.</CardDescription>
                  </CardHeader>
                  <CardContent>
                       <FormField
                          control={balanceForm.control}
                          name="availableBalance"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Available Balance (KES)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} disabled={actionLoading} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                  </CardContent>
                  <CardFooter>
                      <Button type="submit" className="w-full" disabled={actionLoading || !balanceForm.formState.isDirty}>
                          {actionLoading ? <Loader2 className="animate-spin" /> : "Save Balance"}
                      </Button>
                  </CardFooter>
                </form>
            </Form>
          </Card>

           <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
              <CardDescription>Manage user account status.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant={user.disabled ? "outline" : "destructive"} 
                className="w-full"
                onClick={handleToggleSuspend}
                disabled={actionLoading}
              >
                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {user.disabled ? <><CheckCircle className="mr-2"/> Reactivate User</> : <><Ban className="mr-2"/> Suspend User</>}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>User Activity</CardTitle>
                </CardHeader>
                <CardContent>
                     <Tabs defaultValue="investments">
                        <TabsList className="grid w-full grid-cols-1">
                            <TabsTrigger value="investments">Investments</TabsTrigger>
                        </TabsList>
                        <TabsContent value="investments">
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
                                    {investments.length > 0 ? investments.map((inv) => (
                                        <TableRow key={inv.id}>
                                            <TableCell className="font-medium">{inv.name}</TableCell>
                                            <TableCell>{formatCurrency(inv.price)}</TableCell>
                                            <TableCell>{formatCurrency(inv.dailyReturn)}</TableCell>
                                            <TableCell><Badge variant={inv.status === 'active' ? 'default' : 'secondary'}>{inv.status}</Badge></TableCell>
                                            <TableCell className="text-right space-x-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleEditInvestment(inv)}><Pencil className="h-4 w-4" /></Button>
                                                 <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the investment: <strong>{inv.name}</strong>. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteInvestment(inv.id)} className="bg-destructive hover:bg-destructive/80">Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No investments found.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>

      </div>

      <Dialog open={!!editingInvestment} onOpenChange={(open) => !open && setEditingInvestment(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Investment</DialogTitle>
                <DialogDescription>Modify the details for "{editingInvestment?.name}".</DialogDescription>
            </DialogHeader>
            <Form {...investmentForm}>
                <form onSubmit={investmentForm.handleSubmit(handleUpdateInvestment)} className="space-y-4">
                    <FormField control={investmentForm.control} name="price" render={({ field }) => (
                        <FormItem><FormLabel>Price (KES)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={investmentForm.control} name="dailyReturn" render={({ field }) => (
                        <FormItem><FormLabel>Daily Return (KES)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={investmentForm.control} name="status" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setEditingInvestment(null)}>Cancel</Button>
                        <Button type="submit" disabled={actionLoading || !investmentForm.formState.isDirty}>
                            {actionLoading ? <Loader2 className="animate-spin" /> : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>

    </div>
  );
}

    
