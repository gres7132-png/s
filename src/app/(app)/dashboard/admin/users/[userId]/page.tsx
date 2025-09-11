
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
import { Ban, CheckCircle, Info, Loader2, ShieldAlert } from "lucide-react";
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
import { updateUserStatus, listAllUsers, UserData } from "@/ai/flows/user-management";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const profileSchema = z.object({
  displayName: z.string().min(1, "Full name is required.").optional(),
  email: z.string().email("Invalid email address.").optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function UserDetailsPage({ params }: { params: { userId: string } }) {
  const { userId } = params;
  const { toast } = useToast();
  const { isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [referrals, setReferrals] = useState([]);
  const [transactions, setTransactions] = useState({ deposits: [], withdrawals: [] });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      email: "",
    },
  });
  
  const fetchUserData = useCallback(async () => {
    setLoading(true);
    try {
        // In a real app, you'd have a dedicated `getUser(uid)` flow.
        // For this prototype, we'll fetch all users and find the one we need.
        const { users } = await listAllUsers();
        const currentUser = users.find(u => u.uid === userId);
        if (currentUser) {
            setUser(currentUser);
            form.reset({
                displayName: currentUser.displayName || "",
                email: currentUser.email || "",
            });
        } else {
             // In the prototype, this will be the common case.
             console.log("User not found in simulated list. This is expected.");
        }
    } catch(e) {
        toast({ variant: "destructive", title: "Failed to fetch user data" });
    } finally {
        setLoading(false);
    }
  }, [userId, form, toast]);


  useEffect(() => {
    if (isAdmin && userId) {
      fetchUserData();
      // Fetching referrals and transactions would also happen here
    }
  }, [userId, isAdmin, fetchUserData]);

  // Profile form submission is disabled as updating displayName/email
  // requires the Admin SDK, which we are simulating.
  async function onSubmit(values: ProfileFormValues) {
    toast({ title: "Note", description: "Updating user profile details from the admin panel requires the Firebase Admin SDK and is disabled in this prototype." });
  }

  const handleToggleSuspend = async () => {
    if (!user) return;
    setActionLoading(true);
    const newStatus = !user.disabled;
    try {
        await updateUserStatus({ uid: user.uid, disabled: newStatus });
        setUser(prev => prev ? {...prev, disabled: newStatus } : null); // Optimistic update
        toast({
            title: `User ${newStatus ? 'Suspended' : 'Reactivated'}`,
            description: `${user.displayName || user.email} has been ${newStatus ? 'suspended' : 'reactivated'}.`
        });
    } catch (error) {
        toast({ variant: "destructive", title: "Action Failed" });
        // Revert optimistic update on failure
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
                <AlertTitle>User Data Not Loaded</AlertTitle>
                <AlertDescription>
                   User data could not be loaded because the Firebase Admin SDK is not available in this prototype environment. This feature will work in production.
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
                      <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input {...field} readOnly className="bg-muted"/></FormControl><FormMessage /></FormItem>
                  )}/>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled>Save Changes</Button>
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
