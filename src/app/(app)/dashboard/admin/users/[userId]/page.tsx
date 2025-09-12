

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
import { Ban, CheckCircle, Info, Loader2, ShieldAlert, Wallet } from "lucide-react";
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
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";


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

export default function UserDetailsPage({ params }: { params: { userId: string } }) {
  const { userId } = params;
  const { toast } = useToast();
  const { isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [referrals, setReferrals] = useState([]);
  const [transactions, setTransactions] = useState({ deposits: [], withdrawals: [] });

  const profileForm = useForm<{displayName: string, email: string}>({
    defaultValues: {
      displayName: "",
      email: "",
    },
  });

  const paymentForm = useForm<BankingDetailsFormValues>({
    resolver: zodResolver(bankingDetailsSchema),
     defaultValues: {
      paymentMethod: "mobile",
      mobileNumber: "",
      minipayNumber: "",
      cryptoCurrency: undefined,
      cryptoAddress: "",
    },
  });
  
  const fetchUserData = useCallback(async () => {
    setLoading(true);
    try {
        const { users } = await listAllUsers();
        const currentUser = users.find(u => u.uid === userId);
        if (currentUser) {
            setUser(currentUser);
            profileForm.reset({
                displayName: currentUser.displayName || "",
                email: currentUser.email || "",
            });
            
            const paymentDetailsRef = doc(db, "userPaymentDetails", userId);
            const paymentDetailsSnap = await getDoc(paymentDetailsRef);
            if (paymentDetailsSnap.exists()) {
                paymentForm.reset(paymentDetailsSnap.data() as BankingDetailsFormValues);
            }

        } else {
             toast({ variant: "destructive", title: "User Not Found" });
        }
    } catch(e: any) {
        toast({ variant: "destructive", title: "Failed to fetch user data", description: e.message });
    } finally {
        setLoading(false);
    }
  }, [userId, profileForm, paymentForm, toast]);


  useEffect(() => {
    if (isAdmin && userId) {
      fetchUserData();
    }
  }, [userId, isAdmin, fetchUserData]);

  async function onPaymentDetailsSubmit(values: BankingDetailsFormValues) {
    setIsSavingDetails(true);
    try {
        const detailsDocRef = doc(db, "userPaymentDetails", userId);
        await setDoc(detailsDocRef, values, { merge: true });
        toast({
            title: "Payment Details Updated",
            description: `Successfully updated payment information for ${user?.displayName}.`,
        });
    } catch (error) {
         console.error("Error saving payment details:", error);
         toast({ variant: "destructive", title: "Save Failed", description: "Could not save payment details."});
    } finally {
        setIsSavingDetails(false);
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
    } catch (error) {
        toast({ variant: "destructive", title: "Action Failed" });
        setUser(prev => prev ? {...prev, disabled: !newStatus } : null);
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

  const selectedPaymentMethod = paymentForm.watch("paymentMethod");

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
            <Form {...profileForm}>
              <form>
                <CardHeader>
                  <CardTitle>User Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={`https://avatar.vercel.sh/${user?.email}.png`} data-ai-hint="person face" />
                      <AvatarFallback>{user?.displayName?.charAt(0) ?? "U"}</AvatarFallback>
                    </Avatar>
                  </div>
                  <FormField control={profileForm.control} name="displayName" render={({ field }) => (
                      <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} readOnly className="bg-muted" /></FormControl></FormItem>
                  )}/>
                  <FormField control={profileForm.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input {...field} readOnly className="bg-muted"/></FormControl></FormItem>
                  )}/>
                </CardContent>
              </form>
            </Form>
          </Card>
          
           <Card>
            <Form {...paymentForm}>
              <form onSubmit={paymentForm.handleSubmit(onPaymentDetailsSubmit)}>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-muted-foreground"/>
                        <CardTitle>Payment Details</CardTitle>
                    </div>
                  <CardDescription>Withdrawal information saved by the user.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <FormField
                        control={paymentForm.control}
                        name="paymentMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Method</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger disabled={isSavingDetails}>
                                  <SelectValue placeholder="Select a payment method" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="minipay">Minipay</SelectItem>
                                <SelectItem value="mobile">Mobile Money</SelectItem>
                                <SelectItem value="crypto">Crypto Wallet</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {selectedPaymentMethod === "mobile" && (
                        <FormField
                          control={paymentForm.control}
                          name="mobileNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. 0712345678" {...field} disabled={isSavingDetails} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {selectedPaymentMethod === "minipay" && (
                        <FormField
                          control={paymentForm.control}
                          name="minipayNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Minipay Number</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. 0781309701" {...field} disabled={isSavingDetails} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {selectedPaymentMethod === "crypto" && (
                        <div className="space-y-4">
                          <FormField
                            control={paymentForm.control}
                            name="cryptoCurrency"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cryptocurrency</FormLabel>
                                 <Select onValueChange={field.onChange} value={field.value} disabled={isSavingDetails}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a currency" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                                    <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                                    <SelectItem value="USDT">Tether (USDT)</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                           <FormField
                            control={paymentForm.control}
                            name="cryptoAddress"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Wallet Address</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter wallet address" {...field} disabled={isSavingDetails} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full" disabled={isSavingDetails}>
                        {isSavingDetails ? <Loader2 className="animate-spin" /> : "Save Payment Details"}
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
                    <CardDescription>Referrals and transactions for this user.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Tabs defaultValue="referrals">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="referrals">Referrals</TabsTrigger>
                            <TabsTrigger value="deposits">Deposits</TabsTrigger>
                            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
                        </TabsList>
                        <TabsContent value="referrals">
                            <Table>
                                <TableHeader><TableRow><TableHead>User Name</TableHead><TableHead>Invested</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {referrals.length > 0 ? referrals.map((r: any) => (
                                        <TableRow key={r.id}>
                                            <TableCell>{r.name}</TableCell>
                                            <TableCell>{formatCurrency(r.capital)}</TableCell>
                                            <TableCell><Badge variant={r.status === 'Active' ? 'default' : 'secondary'}>{r.status}</Badge></TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No referrals found.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </TabsContent>
                         <TabsContent value="deposits">
                             <Table>
                                <TableHeader><TableRow><TableHead>Amount</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {transactions.deposits.length > 0 ? transactions.deposits.map((t: any) => (
                                        <TableRow key={t.id}>
                                            <TableCell>{formatCurrency(t.amount)}</TableCell>
                                            <TableCell>{t.date.toLocaleDateString()}</TableCell>
                                            <TableCell><Badge>{t.status}</Badge></TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No deposits found.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </TabsContent>
                         <TabsContent value="withdrawals">
                             <Table>
                                <TableHeader><TableRow><TableHead>Amount</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                <TableBody>
                                     {transactions.withdrawals.length > 0 ? transactions.withdrawals.map((t: any) => (
                                        <TableRow key={t.id}>
                                            <TableCell>{formatCurrency(t.amount)}</TableCell>
                                            <TableCell>{t.date.toLocaleDateString()}</TableCell>
                                            <TableCell><Badge variant="secondary">{t.status}</Badge></TableCell>
                                        </TableRow>
                                    )): <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No withdrawals found.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>

      </div>
    </div>
  );
}


    