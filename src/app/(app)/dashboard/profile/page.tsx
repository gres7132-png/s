

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
import { AlertCircle, Loader2 } from "lucide-react";
import { updateProfile } from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";


const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  email: z.string().email("Invalid email address.").readonly(),
  bio: z.string().max(160, "Bio must be 160 characters or less.").optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: "", lastName: "", email: "", bio: "" },
  });

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      const unsubUser = onSnapshot(userDocRef, (doc) => {
        const data = doc.data();
        profileForm.reset({
          firstName: data?.firstName || "",
          lastName: data?.lastName || "",
          email: user.email || "",
          bio: data?.bio || "",
        });
      });
      
      return () => {
        unsubUser();
      };
    }
  }, [user, profileForm]);

  async function onProfileSubmit(values: ProfileFormValues) {
    if (!user) return;
    setLoading(true);
    try {
      const newDisplayName = `${values.firstName} ${values.lastName}`.trim();
      if (newDisplayName !== user.displayName) {
        await updateProfile(user, { displayName: newDisplayName });
      }
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, { 
        bio: values.bio,
        firstName: values.firstName,
        lastName: values.lastName,
        displayName: newDisplayName,
      }, { merge: true });
      toast({ title: "Profile Updated" });
    } catch (error) {
      toast({ variant: "destructive", title: "Update Failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal and payment information.
        </p>
      </div>

    <div className="grid gap-8 lg:grid-cols-3">
     <div className="lg:col-span-2 space-y-8">
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
                    <FormField control={profileForm.control} name="firstName" render={({ field }) => (
                        <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={profileForm.control} name="lastName" render={({ field }) => (
                        <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                 <FormField control={profileForm.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="user@example.com" {...field} readOnly className="bg-muted"/></FormControl><FormMessage /></FormItem>
                )} />
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
            <CardHeader>
                <CardTitle>Payment Details</CardTitle>
                <CardDescription>
                    This is where your withdrawals will be sent.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        To ensure security and prevent confusion, all payment details are now managed in one place.
                    </AlertDescription>
                </Alert>
            </CardContent>
             <CardFooter>
                <Button asChild className="w-full">
                    <Link href="/dashboard/wallet?tab=banking">Manage Payment Details</Link>
                </Button>
            </CardFooter>
        </Card>
      </div>
     </div>
    </div>
  );
}
