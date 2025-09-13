

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
  CardFooter
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


const profileSchema = z.object({
  fullName: z.string().min(1, "Full name is required."),
  email: z.string().email("Invalid email address.").readonly(),
  bio: z.string().max(160, "Bio must be 160 characters or less.").optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

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

export default function ProfilePage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: "", email: "", bio: "" },
  });

  const bankingDetailsForm = useForm<BankingDetailsFormValues>({
    resolver: zodResolver(bankingDetailsSchema),
     defaultValues: {
      paymentMethod: "mobile",
      mobileNumber: "",
      minipayNumber: "",
      cryptoCurrency: undefined,
      cryptoAddress: "",
    },
  });

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      const unsubUser = onSnapshot(userDocRef, (doc) => {
        const data = doc.data();
        profileForm.reset({
          fullName: user.displayName || "",
          email: user.email || "",
          bio: data?.bio || "",
        });
      });

      const detailsDocRef = doc(db, "userPaymentDetails", user.uid);
      const unsubDetails = onSnapshot(detailsDocRef, (doc) => {
        if (doc.exists()) {
          bankingDetailsForm.reset(doc.data() as BankingDetailsFormValues);
        }
      });
      
      return () => {
        unsubUser();
        unsubDetails();
      };
    }
  }, [user, profileForm, bankingDetailsForm]);

  async function onProfileSubmit(values: ProfileFormValues) {
    if (!user) return;
    setLoading(true);
    try {
      if (values.fullName !== user.displayName) {
        await updateProfile(user, { displayName: values.fullName });
      }
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, { 
        bio: values.bio,
        displayName: values.fullName,
      }, { merge: true });
      toast({ title: "Profile Updated" });
    } catch (error) {
      toast({ variant: "destructive", title: "Update Failed" });
    } finally {
      setLoading(false);
    }
  }

  async function onBankingDetailsSubmit(values: BankingDetailsFormValues) {
    if (!user) return;
    setIsSavingDetails(true);
    try {
        const detailsDocRef = doc(db, "userPaymentDetails", user.uid);
        await setDoc(detailsDocRef, values, { merge: true });
        toast({ title: "Payment Details Updated" });
    } catch (error) {
         toast({ variant: "destructive", title: "Save Failed" });
    } finally {
        setIsSavingDetails(false);
    }
  }

  const selectedPaymentMethod = bankingDetailsForm.watch("paymentMethod");


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal and payment information.
        </p>
      </div>

    <div className="grid gap-8 lg:grid-cols-3">
     <div className="lg:col-span-2">
        <Card>
            <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                    Update your personal details here.
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                <div className="flex items-center space-x-4">
                    <Avatar className="h-20 w-20">
                    <AvatarImage src={`https://avatar.vercel.sh/${user?.email}.png`} data-ai-hint="person face" />
                    <AvatarFallback>{user?.displayName?.charAt(0) ?? "U"}</AvatarFallback>
                    </Avatar>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={profileForm.control} name="fullName" render={({ field }) => (
                        <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={profileForm.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="user@example.com" {...field} readOnly className="bg-muted"/></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <FormField control={profileForm.control} name="bio" render={({ field }) => (
                    <FormItem><FormLabel>Bio</FormLabel><FormControl><Textarea placeholder="Tell us a little bit about yourself" className="resize-none" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                <Button type="submit" disabled={loading || authLoading}>
                    {(loading || authLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Personal Info
                </Button>
                </CardFooter>
            </form>
            </Form>
        </Card>
      </div>
      
       <div className="lg:col-span-1">
         <Card>
            <Form {...bankingDetailsForm}>
            <form onSubmit={bankingDetailsForm.handleSubmit(onBankingDetailsSubmit)}>
                <CardHeader>
                    <CardTitle>Payment Details</CardTitle>
                    <CardDescription>
                        This is where your withdrawals will be sent.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <FormField control={bankingDetailsForm.control} name="paymentMethod" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger disabled={isSavingDetails}><SelectValue placeholder="Select a payment method" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="minipay">Minipay</SelectItem>
                            <SelectItem value="mobile">Mobile Money</SelectItem>
                            <SelectItem value="crypto">Crypto Wallet</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  
                  {selectedPaymentMethod === "mobile" && (
                    <FormField control={bankingDetailsForm.control} name="mobileNumber" render={({ field }) => (
                        <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="e.g. 0712345678" {...field} disabled={isSavingDetails} /></FormControl><FormMessage /></FormItem>
                    )} />
                  )}

                  {selectedPaymentMethod === "minipay" && (
                    <FormField control={bankingDetailsForm.control} name="minipayNumber" render={({ field }) => (
                        <FormItem><FormLabel>Minipay Number</FormLabel><FormControl><Input placeholder="e.g. 0781309701" {...field} disabled={isSavingDetails} /></FormControl><FormMessage /></FormItem>
                    )} />
                  )}

                  {selectedPaymentMethod === "crypto" && (
                    <div className="space-y-4">
                      <FormField control={bankingDetailsForm.control} name="cryptoCurrency" render={({ field }) => (
                          <FormItem><FormLabel>Cryptocurrency</FormLabel>
                             <Select onValueChange={field.onChange} value={field.value} disabled={isSavingDetails}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Select a currency" /></SelectTrigger></FormControl>
                              <SelectContent><SelectItem value="BTC">Bitcoin (BTC)</SelectItem><SelectItem value="ETH">Ethereum (ETH)</SelectItem><SelectItem value="USDT">Tether (USDT)</SelectItem></SelectContent>
                            </Select><FormMessage />
                          </FormItem>
                        )} />
                       <FormField control={bankingDetailsForm.control} name="cryptoAddress" render={({ field }) => (
                          <FormItem><FormLabel>Wallet Address</FormLabel><FormControl><Input placeholder="Enter your wallet address" {...field} disabled={isSavingDetails} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                  )}
                </CardContent>
                 <CardFooter className="border-t px-6 py-4">
                    <Button type="submit" className="w-full" disabled={isSavingDetails}>
                        {isSavingDetails ? <Loader2 className="animate-spin" /> : "Save Payment Details"}
                    </Button>
                </CardFooter>
            </form>
            </Form>
        </Card>
      </div>
     </div>
    </div>
  );
}
