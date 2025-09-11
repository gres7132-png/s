
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
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const profileSchema = z.object({
  fullName: z.string().min(1, "Full name is required."),
  email: z.string().email("Invalid email address.").readonly(),
  bio: z.string().max(160, "Bio must be 160 characters or less.").optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      email: "",
      bio: "",
    },
  });

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        const bio = userDoc.exists() ? userDoc.data().bio : "";

        form.reset({
          fullName: user.displayName || "",
          email: user.email || "",
          bio: bio || "",
        });
      };
      
      fetchProfile();
    }
  }, [user, form]);

  async function onSubmit(values: ProfileFormValues) {
    if (!user) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to update your profile." });
      return;
    }

    setLoading(true);
    try {
      // Update Firebase Auth display name if it has changed
      if (values.fullName !== user.displayName) {
        await updateProfile(user, { displayName: values.fullName });
      }

      // Update the user document in Firestore with the new bio
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, { 
        bio: values.bio,
        displayName: values.fullName, // Also keep displayName in sync in Firestore
      }, { merge: true });

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update your profile. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal information.
        </p>
      </div>

      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
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
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="user@example.com" {...field} readOnly className="bg-muted"/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
               <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us a little bit about yourself"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button type="submit" disabled={loading || authLoading}>
                {(loading || authLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
