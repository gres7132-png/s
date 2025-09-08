
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
import { useEffect, useState } from "react";
import { Ban, CheckCircle, Loader2, ShieldAlert } from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";

// In a production app, this data would come from a secure backend API/Firebase Function
// The client-side SDK cannot list or edit all users directly.

const profileSchema = z.object({
  displayName: z.string().min(1, "Full name is required."),
  email: z.string().email("Invalid email address.").readonly(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function UserDetailsPage({ params }: { params: { userId: string } }) {
  const { userId } = params;
  const { toast } = useToast();
  const { isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  // State for user data, referrals, and transactions would be populated from your backend
  const [user, setUser] = useState<(Partial<FirebaseUser> & { disabled?: boolean }) | null>(null);
  const [referrals, setReferrals] = useState([]);
  const [transactions, setTransactions] = useState({ deposits: [], withdrawals: [] });


  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      email: "",
    },
  });

  useEffect(() => {
    if (userId) {
      setLoading(true);
      // --- Backend Fetching Placeholder ---
      // In a real app, you would make a secure call to your backend/Firebase Function here
      // to get the user's details, their referrals, and their transaction history.
      // const userData = await yourBackend.getUserDetails(userId);
      // const referralData = await yourBackend.getUserReferrals(userId);
      // const transactionData = await yourBackend.getUserTransactions(userId);
      // setUser(userData);
      // setReferrals(referralData);
      // setTransactions(transactionData);
      // form.reset({
      //   displayName: userData?.displayName || "",
      //   email: userData?.email || "",
      // });
      setLoading(false);
    }
  }, [userId, form]);

  async function onSubmit(values: ProfileFormValues) {
    setLoading(true);
    try {
      // --- Backend Logic Placeholder ---
      // await yourBackend.updateUserProfile(userId, values);
      console.log("Profile update for", userId, values);
      toast({
        title: "Profile Updated",
        description: `${values.displayName}'s profile has been updated.`,
      });
    } catch (error) {
      toast({ variant: "destructive", title: "Update Failed" });
    } finally {
      setLoading(false);
    }
  }

  const handleToggleSuspend = async () => {
    if (!user) return;
    setActionLoading(true);
    const newStatus = !user.disabled;
    try {
        // --- Backend Logic Placeholder ---
        // This would be a Firebase Function call to update the user's disabled state in Firebase Auth
        // await yourBackend.toggleUserSuspension(user.uid, newStatus);
        setUser(prev => prev ? {...prev, disabled: newStatus } : null); // Optimistic update
        toast({
            title: `User ${newStatus ? 'Suspended' : 'Reactivated'}`,
            description: `${user.displayName} has been ${newStatus ? 'suspended' : 'reactivated'}.`
        });
    } catch (error) {
        toast({ variant: "destructive", title: "Action Failed" });
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
     return <div className="text-center pt-8">User not found or data could not be loaded.</div>;
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
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
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
                  <FormField control={form.control} name="displayName" render={({ field }) => (
                      <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input {...field} readOnly className="bg-muted"/></FormControl><FormMessage /></FormItem>
                  )}/>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={loading}>Save Changes</Button>
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
                variant={user.disabled ? "default" : "destructive"} 
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
