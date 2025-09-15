
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { ShieldCheck, MailWarning, Fingerprint, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { sendEmailVerification } from "firebase/auth";
import { useState } from "react";

export default function SecurityPage() {
  const { user, emailVerified, loading } = useAuth();
  const { toast } = useToast();
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleResendVerification = async () => {
    if (!user) return;
    setIsSendingEmail(true);
    try {
      await sendEmailVerification(user);
      toast({
        title: "Verification Email Sent",
        description: "Please check your inbox (and spam folder) for the verification link.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Sending Email",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security</h1>
        <p className="text-muted-foreground">
          Manage your account's security settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verification Status</CardTitle>
          <CardDescription>
            Review the status of your account verification methods.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {/* Email Verification Section */}
            <div className="flex items-start gap-4 p-4 border rounded-lg">
                <div>
                   {emailVerified ? <ShieldCheck className="h-8 w-8 text-green-500" /> : <MailWarning className="h-8 w-8 text-yellow-500" />}
                </div>
                <div className="flex-grow">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold">Email Verification</h3>
                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> :
                         emailVerified ? (
                            <Badge variant="default">Verified</Badge>
                         ) : (
                            <Badge variant="destructive">Unverified</Badge>
                         )
                        }
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        {emailVerified ? 'Your email address has been successfully verified.' : 'Please verify your email address to enhance your account security.'}
                    </p>
                     {!emailVerified && !loading && (
                        <Button size="sm" variant="secondary" className="mt-3" onClick={handleResendVerification} disabled={isSendingEmail}>
                            {isSendingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Resend Verification Email
                        </Button>
                     )}
                </div>
            </div>

             {/* Biometric Verification Section */}
            <div className="flex items-start gap-4 p-4 border rounded-lg">
                 <div>
                   <Fingerprint className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="flex-grow">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold">Biometric Identity Verification</h3>
                        <Badge variant="secondary">Coming Soon</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Enhance your account security with facial recognition. This feature is currently under development.
                    </p>
                </div>
            </div>

        </CardContent>
      </Card>
    </div>
  );
}
