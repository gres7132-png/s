
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
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const settingsSchema = z.object({
  mobileMoney: z.string().min(1, "This field is required."),
  btcAddress: z.string().min(1, "BTC Address is required."),
  ethAddress: z.string().min(1, "ETH Address is required."),
  usdtAddress: z.string().min(1, "USDT Address is required."),
  minipay: z.string().min(1, "This field is required."),
  withdrawalFee: z.coerce.number().min(0, "Fee cannot be negative.").max(100, "Fee cannot be over 100%."),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function ManageSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      mobileMoney: "",
      btcAddress: "",
      ethAddress: "",
      usdtAddress: "",
      minipay: "",
      withdrawalFee: 15,
    },
  });

  useEffect(() => {
    // --- Backend Fetching Placeholder ---
    const fetchSettings = async () => {
        // In a real app, you would fetch this from Firestore
        // const settings = await getSiteSettings();
        // if (settings) {
        //     form.reset(settings);
        // }
    }
    fetchSettings();
  }, [form]);

  async function onSubmit(values: SettingsFormValues) {
    setLoading(true);
    try {
      // --- Backend Logic Placeholder ---
      // await updateSiteSettings(values);
      console.log("Updating site settings:", values);
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Settings Updated",
        description: `Site settings have been successfully saved.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not save settings. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Site Settings</h1>
        <p className="text-muted-foreground">
          Manage platform-wide settings like payment details and fees.
        </p>
      </div>

        <Card className="max-w-2xl">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
                <CardTitle>Payment & Fee Configuration</CardTitle>
                <CardDescription>
                    These details will be shown to users for deposits and withdrawals.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <FormField control={form.control} name="mobileMoney" render={({ field }) => (
                <FormItem><FormLabel>Mobile Money Details (Airtel/Safaricom)</FormLabel><FormControl><Input placeholder="e.g., Paybill XXXX, Account YYYY" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="btcAddress" render={({ field }) => (
                        <FormItem><FormLabel>BTC Address</FormLabel><FormControl><Input placeholder="Bitcoin wallet address" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="ethAddress" render={({ field }) => (
                        <FormItem><FormLabel>ETH Address</FormLabel><FormControl><Input placeholder="Ethereum wallet address" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <FormField control={form.control} name="usdtAddress" render={({ field }) => (
                    <FormItem><FormLabel>USDT Address</FormLabel><FormControl><Input placeholder="USDT (Tether) wallet address" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="minipay" render={({ field }) => (
                    <FormItem><FormLabel>MiniPay (WhatsApp) Details</FormLabel><FormControl><Input placeholder="e.g., WhatsApp Number or Link" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <hr className="my-4" />
                
                <FormField control={form.control} name="withdrawalFee" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Withdrawal Fee (%)</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <Input type="number" placeholder="15" className="pr-8" {...field} />
                                <span className="absolute inset-y-0 right-3 flex items-center text-muted-foreground">%</span>
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                
            </CardContent>
            <CardFooter>
                <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Settings
                </Button>
            </CardFooter>
            </form>
        </Form>
        </Card>
    </div>
  );
}
