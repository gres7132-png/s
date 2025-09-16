

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, writeBatch, serverTimestamp, setDoc } from "firebase/firestore";


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
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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

const signInSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

const signUpSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().min(1, { message: "Last name is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  referralCode: z.string().optional(),
});

const resetPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;


export function AuthForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const searchParams = useSearchParams();
  const referralCodeFromUrl = searchParams.get('ref');

  const signInForm = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      referralCode: referralCodeFromUrl || "",
    },
  });
  
  const resetPasswordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: "" },
  });


  useEffect(() => {
    if (referralCodeFromUrl) {
      signUpForm.setValue("referralCode", referralCodeFromUrl);
    }
  }, [referralCodeFromUrl, signUpForm]);


  async function onSignInSubmit(values: z.infer<typeof signInSchema>) {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Sign in error:", error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onSignUpSubmit(values: z.infer<typeof signUpSchema>) {
    setIsLoading(true);
    try {
      // First, attempt to create the user document with the email as the ID
      // This will fail if the email is not unique, thanks to our Firestore rule.
      const userPreviewRef = doc(db, "users", values.email);
      await setDoc(userPreviewRef, { email: values.email });

      // If the above succeeds, create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const newUser = userCredential.user;
      const displayName = `${values.firstName} ${values.lastName}`.trim();

      await updateProfile(newUser, {
        displayName: displayName,
      });

      // Send verification email
      await sendEmailVerification(newUser);

      // Now, use a batch write to set up the final user documents
      const batch = writeBatch(db);

      // 1. Overwrite the preview doc with the full user document, now using the UID as the ID
      const userDocRef = doc(db, "users", newUser.uid);
      batch.set(userDocRef, {
        firstName: values.firstName,
        lastName: values.lastName,
        displayName: displayName,
        email: values.email,
        createdAt: serverTimestamp(),
        referredBy: values.referralCode || null,
        hasActiveInvestment: false, // Initialize hasActiveInvestment flag
      });

      // 2. Set the user stats document
      const userStatsDocRef = doc(db, "userStats", newUser.uid);
      batch.set(userStatsDocRef, {
        availableBalance: 0,
        todaysEarnings: 0,
        rechargeAmount: 0,
        withdrawalAmount: 0,
      });

      // 3. Delete the temporary email-based document
      batch.delete(userPreviewRef);
      
      await batch.commit();

      toast({
        title: "Welcome!",
        description: "Your account has been created. Please check your email to verify your account.",
      });
      router.push("/dashboard");

    } catch (error: any) {
      console.error("Sign up error:", error);
       if (error.code === 'permission-denied') {
        toast({
            variant: "destructive",
            title: "Sign Up Failed",
            description: "This email address is already in use. Please use a different email.",
        });
       } else if (error.code === 'auth/email-already-in-use') {
         toast({
            variant: "destructive",
            title: "Sign Up Failed",
            description: "This email address is already registered. Please sign in or use a different email.",
        });
       } else {
        toast({
            variant: "destructive",
            title: "Sign Up Failed",
            description: error.message || "An unexpected error occurred.",
        });
       }
    } finally {
      setIsLoading(false);
    }
  }

  async function onPasswordResetSubmit(values: ResetPasswordFormValues) {
    setIsResetting(true);
    try {
        await sendPasswordResetEmail(auth, values.email);
        toast({
            title: "Password Reset Email Sent",
            description: "Please check your inbox for a link to reset your password, then return here to log in.",
        });
        setIsResetDialogOpen(false); // Close the dialog on success
    } catch (error: any) {
        console.error("Password reset error:", error);
        toast({
            variant: "destructive",
            title: "Request Failed",
            description: error.message || "An unexpected error occurred. Please try again.",
        });
    } finally {
        setIsResetting(false);
    }
  }

  return (
    <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
    <Tabs defaultValue="signin" className="w-full max-w-md">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="signin">Sign In</TabsTrigger>
        <TabsTrigger value="signup">Sign Up</TabsTrigger>
      </TabsList>
      <TabsContent value="signin">
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...signInForm}>
              <form
                onSubmit={signInForm.handleSubmit(onSignInSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={signInForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signInForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                       <div className="flex items-center justify-between">
                        <FormLabel>Password</FormLabel>
                        <DialogTrigger asChild>
                            <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                                Forgot password?
                            </Button>
                        </DialogTrigger>
                      </div>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="signup">
        <Card>
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>
              Create an account to start your investment journey.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...signUpForm}>
              <form
                onSubmit={signUpForm.handleSubmit(onSignUpSubmit)}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={signUpForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={signUpForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signUpForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signUpForm.control}
                  name="referralCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referral Code (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter referral code" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isLoading}>
                   {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

     <DialogContent>
        <DialogHeader>
            <DialogTitle>Reset Your Password</DialogTitle>
            <DialogDescription>
                Enter your account's email address and we will send you a link to reset your password.
            </DialogDescription>
        </DialogHeader>
        <Form {...resetPasswordForm}>
            <form id="reset-password-form" onSubmit={resetPasswordForm.handleSubmit(onPasswordResetSubmit)} className="space-y-4 py-4">
                <FormField
                    control={resetPasswordForm.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="name@example.com" {...field} disabled={isResetting} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </form>
        </Form>
        <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={isResetting}>Cancel</Button>
            </DialogClose>
            <Button type="submit" form="reset-password-form" disabled={isResetting}>
                {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Link
            </Button>
        </DialogFooter>
    </DialogContent>
    </Dialog>
  );
}

    