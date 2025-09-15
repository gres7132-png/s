

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
import { AlertCircle, Loader2, Upload } from "lucide-react";
import { updateProfile, verifyBeforeUpdateEmail } from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db, storage } from "@/lib/firebase";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";


const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  email: z.string().email("Invalid email address.").readonly(),
  phoneNumber: z.string().optional(),
  age: z.coerce.number().positive("Age must be a positive number.").optional(),
  birthYear: z.coerce.number().gt(1900, "Enter a valid birth year.").optional(),
  bio: z.string().max(160, "Bio must be 160 characters or less.").optional(),
  photo: z.any().optional(),
});


const emailSchema = z.object({
    newEmail: z.string().email("Please enter a valid new email address."),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type EmailFormValues = z.infer<typeof emailSchema>;

export default function ProfilePage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { 
      firstName: "", 
      lastName: "", 
      email: "", 
      bio: "", 
      phoneNumber: "", 
      age: undefined, 
      birthYear: undefined 
    },
  });
  
  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { newEmail: "" },
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
          phoneNumber: data?.phoneNumber || "",
          age: data?.age || undefined,
          birthYear: data?.birthYear || undefined,
          bio: data?.bio || "",
        });
        emailForm.reset({
            newEmail: user.email || "",
        });
      });
      
      return () => {
        unsubUser();
      };
    }
  }, [user, profileForm, emailForm]);

  async function onProfileSubmit(values: ProfileFormValues) {
    if (!user) return;
    setLoading(true);
    try {
        const newDisplayName = `${values.firstName} ${values.lastName}`.trim();
        let photoURL = user.photoURL;

        // Handle profile photo upload
        const imageFile = values.photo?.[0];
        if (imageFile) {
            const storageRef = ref(storage, `profileImages/${user.uid}`);
            await uploadBytes(storageRef, imageFile);
            photoURL = await getDownloadURL(storageRef);
        }
      
        if (newDisplayName !== user.displayName || photoURL !== user.photoURL) {
            await updateProfile(user, { 
                displayName: newDisplayName,
                photoURL: photoURL,
             });
        }
        
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, { 
            bio: values.bio,
            firstName: values.firstName,
            lastName: values.lastName,
            displayName: newDisplayName,
            email: values.email, // Keep email in firestore for reference
            phoneNumber: values.phoneNumber,
            age: values.age,
            birthYear: values.birthYear,
            photoURL: photoURL,
        }, { merge: true });

      toast({ title: "Profile Updated" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function onEmailSubmit(values: EmailFormValues) {
    if (!user || values.newEmail === user.email) {
        toast({ variant: "destructive", title: "No Change", description: "The new email is the same as the current one." });
        return;
    };
    setIsChangingEmail(true);
    try {
        await verifyBeforeUpdateEmail(user, values.newEmail);
        toast({
            title: "Verification Required",
            description: `A verification link has been sent to ${values.newEmail}. Please click the link to complete the email change.`,
        });
        setIsEmailDialogOpen(false); // Close dialog on success
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Email Change Failed",
            description: error.code === 'auth/requires-recent-login'
                ? "This is a sensitive operation. Please sign out and sign back in before changing your email."
                : error.message || "An unexpected error occurred."
        });
    } finally {
        setIsChangingEmail(false);
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
        <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                <Card>
                    <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>
                        Update your personal details here. Email address must be changed separately for security.
                    </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                    <div className="flex items-center space-x-4">
                        <Avatar className="h-20 w-20">
                        <AvatarImage src={user?.photoURL ?? `https://avatar.vercel.sh/${user?.email}.png`} data-ai-hint="person face" />
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
                        <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <div className="flex items-center gap-2">
                                <FormControl><Input type="email" placeholder="user@example.com" {...field} readOnly className="bg-muted"/></FormControl>
                                <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button type="button" variant="outline">Change</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Change Your Email Address</DialogTitle>
                                            <DialogDescription>
                                                Enter your new email address below. A verification link will be sent to it to confirm the change.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <Form {...emailForm}>
                                            <form id="email-change-form" onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4 py-4">
                                                <FormField control={emailForm.control} name="newEmail" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>New Email</FormLabel>
                                                        <FormControl>
                                                            <Input type="email" placeholder="new.email@example.com" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                            </form>
                                        </Form>
                                        <DialogFooter>
                                            <DialogClose asChild>
                                                <Button type="button" variant="ghost" disabled={isChangingEmail}>Cancel</Button>
                                            </DialogClose>
                                            <Button type="submit" form="email-change-form" disabled={isChangingEmail}>
                                                {isChangingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Send Verification
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )} />
                     <div className="grid md:grid-cols-3 gap-4">
                         <FormField control={profileForm.control} name="phoneNumber" render={({ field }) => (
                            <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="e.g. +123456789" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={profileForm.control} name="age" render={({ field }) => (
                            <FormItem><FormLabel>Age</FormLabel><FormControl><Input type="number" placeholder="e.g. 30" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={profileForm.control} name="birthYear" render={({ field }) => (
                            <FormItem><FormLabel>Birth Year</FormLabel><FormControl><Input type="number" placeholder="e.g. 1993" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormMessage /></FormItem>
                        )} />
                    </div>
                    <FormField control={profileForm.control} name="bio" render={({ field }) => (
                        <FormItem><FormLabel>Bio</FormLabel><FormControl><Textarea placeholder="Tell us a little bit about yourself" className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                    <Button type="submit" disabled={loading || authLoading}>
                        {(loading || authLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Personal Info
                    </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Profile Picture</CardTitle>
                        <CardDescription>
                            Upload a photo for your public profile avatar.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <FormField control={profileForm.control} name="photo" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Profile Photo</FormLabel>
                                <FormControl>
                                    <div className="relative flex items-center gap-2">
                                        <Input type="file" accept="image/*" className="w-full" onChange={(e) => field.onChange(e.target.files)} />
                                        <Upload className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                         )} />
                    </CardContent>
                </Card>
             </form>
        </Form>
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
                    <AlertTitle>Centralized Management</AlertTitle>
                    <AlertDescription>
                        To ensure security and prevent confusion, all payment details are now managed in the <Link href="/dashboard/wallet?tab=banking" className="font-bold underline">Withdraw/Deposit</Link> section.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
      </div>
    </div>
    </div>
  );
}

