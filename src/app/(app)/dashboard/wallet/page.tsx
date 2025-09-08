
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
  FormDescription,
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
import { formatCurrency } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, DollarSign, Link as LinkIcon, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { paymentDetails } from "@/lib/config";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";


interface UserWalletData {
    withdrawableBalance: number;
}

export default function WalletPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [walletData, setWalletData] = useState<UserWalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  useEffect(() => {
    if (user) {
        const fetchWalletData = async () => {
            setIsLoading(true);
            
            // --- Backend Fetching Placeholder ---
            // const data = await getUserWalletData(user.uid);
            // setWalletData(data);
            
            setIsLoading(false);
        };
        fetchWalletData();
    }
  }, [user]);

  const copyToClipboard = (text: string | undefined, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: `${label} has been copied.`,
    });
  };

  const withdrawableBalance = walletData?.withdrawableBalance ?? 0;

  const withdrawalSchema = z.object({
    amount: z.coerce
        .number()
        .positive({ message: "Amount must be positive." })
        .min(10, { message: "Minimum withdrawal is $10." })
        .max(withdrawableBalance, { message: `Amount exceeds withdrawable balance of ${formatCurrency(withdrawableBalance, true)}.` }),
    });

  const bankingDetailsSchema = z.object({
    paymentMethod: z.enum(["mobile", "crypto", "minipay"]),
    mobileNumber: z.string().optional(),
    minipayNumber: z.string().optional(),
    cryptoCurrency: z.enum(["BTC", "ETH", "USDT"]).optional(),
    cryptoAddress: z.string().optional(),
  }).refine(data => {
      if (data.paymentMethod === "mobile") return !!data.mobileNumber;
      if (data.paymentMethod === "minipay") return !!data.minipayNumber;
      if (data.paymentMethod === "crypto") return !!data.cryptoCurrency && !!data.cryptoAddress;
      return true;
  }, {
      message: "Please fill in the required details for the selected payment method.",
      path: ["paymentMethod"],
  });

  const depositSchema = z.object({
      transactionProof: z.string().min(10, "Please enter a valid transaction ID or hash."),
  });

  const withdrawalForm = useForm<z.infer<typeof withdrawalSchema>>({
    resolver: zodResolver(withdrawalSchema),
  });

  const bankingDetailsForm = useForm<z.infer<typeof bankingDetailsSchema>>({
    resolver: zodResolver(bankingDetailsSchema),
    defaultValues: {
      paymentMethod: "mobile",
    },
  });

  const depositForm = useForm<z.infer<typeof depositSchema>>({
    resolver: zodResolver(depositSchema),
  });

  function onWithdrawalSubmit(values: z.infer<typeof withdrawalSchema>) {
    console.log("Withdrawal request:", values);
    toast({
      title: "Withdrawal Requested",
      description: `Your request to withdraw ${formatCurrency(values.amount)} is being processed.`,
    });
    withdrawalForm.reset();
  }

  function onBankingDetailsSubmit(values: z.infer<typeof bankingDetailsSchema>) {
    console.log("Banking details update:", values);
    toast({
      title: "Banking Details Updated",
      description: "Your payment information has been saved securely.",
    });
  }

  async function onDepositSubmit(values: z.infer<typeof depositSchema>) {
    if (!user) {
        toast({
            variant: "destructive",
            title: "Not Authenticated",
            description: "You must be logged in to submit proof.",
        });
        return;
    }
    
    setIsSubmittingProof(true);
    try {
        await addDoc(collection(db, "transactionProofs"), {
            userId: user.uid,
            userName: user.displayName || 'Unknown User',
            proof: values.transactionProof,
            submittedAt: serverTimestamp(),
            status: 'pending', // Initial status
        });

        toast({
          title: "Proof Submitted",
          description: "Your deposit is being verified and will reflect in your account shortly.",
        });
        depositForm.reset();
    } catch (error) {
        console.error("Error submitting proof:", error);
        toast({
            variant: "destructive",
            title: "Submission Failed",
            description: "Could not submit your proof. Please try again.",
        });
    } finally {
        setIsSubmittingProof(false);
    }
  }

  const selectedPaymentMethod = bankingDetailsForm.watch("paymentMethod");

  const DetailRow = ({ label, value }: { label: string; value: string | undefined }) => (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/50">
        <div>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            {value ? (
                <p className="text-sm text-muted-foreground break-all font-bold">{value}</p>
            ) : (
                <p className="text-sm text-muted-foreground font-bold">-</p>
            )}
        </div>
        <Button 
            size="icon" 
            variant="ghost" 
            className="flex-shrink-0"
            onClick={() => copyToClipboard(value, label)}
            aria-label={`Copy ${label}`}
            disabled={!value}
        >
            <Copy className="h-4 w-4" />
        </Button>
    </div>
  );
  
  const MinipayDetailRow = ({ label, link, number }: { label: string; link: string; number: string }) => (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/50">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
            <Link href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline font-bold">
                {link}
            </Link>
        </div>
        <p className="text-sm text-muted-foreground break-all font-bold mt-1">Number: {number}</p>
      </div>
       <Button 
            size="icon" 
            variant="ghost" 
            className="flex-shrink-0"
            onClick={() => copyToClipboard(number, "Minipay Number")}
            aria-label="Copy Minipay Number"
        >
            <Copy className="h-4 w-4" />
        </Button>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Withdraw / Deposit</h1>
        <p className="text-muted-foreground">
          Manage your funds and payment details.
        </p>
      </div>

      <Tabs defaultValue="deposit" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="deposit">Deposit</TabsTrigger>
          <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
          <TabsTrigger value="banking">Payment Details</TabsTrigger>
        </TabsList>
        <TabsContent value="deposit">
          <Card className="max-w-lg">
            <CardHeader>
                <CardTitle>Make a Deposit</CardTitle>
                <CardDescription>
                    To add funds, please make a payment to one of the addresses below.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2 rounded-lg border p-4">
                    <h3 className="font-semibold mb-2">Company Payment Details</h3>
                     <div className="space-y-2">
                        <MinipayDetailRow label="Minipay" link={paymentDetails.minipay.link} number={paymentDetails.minipay.number} />
                        <DetailRow label="Mobile Money" value={paymentDetails.mobileMoney} />
                        <DetailRow label="BTC Address" value={paymentDetails.crypto.BTC} />
                        <DetailRow label="ETH Address" value={paymentDetails.crypto.ETH} />
                        <DetailRow label="USDT Address" value={paymentDetails.crypto.USDT} />
                    </div>
                </div>

                <Form {...depositForm}>
                    <form onSubmit={depositForm.handleSubmit(onDepositSubmit)} className="space-y-4">
                         <p className="text-sm text-muted-foreground">After making a payment, paste the transaction proof below and submit.</p>
                        <FormField
                            control={depositForm.control}
                            name="transactionProof"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Proof of Transaction</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Paste the transaction hash, ID, or confirmation code here."
                                            className="resize-none"
                                            {...field}
                                            disabled={isSubmittingProof}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Your account will be credited once the transaction is verified.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isSubmittingProof}>
                            {isSubmittingProof ? <Loader2 className="animate-spin" /> : "Submit Proof"}
                        </Button>
                    </form>
                </Form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="withdraw">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Request Withdrawal</CardTitle>
              <CardDescription>
                A 15% service fee will be deducted from every withdrawal. Processing may take 3-5 business days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...withdrawalForm}>
                <form
                  onSubmit={withdrawalForm.handleSubmit(onWithdrawalSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={withdrawalForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="number" placeholder="0.00" className="pl-8" {...field} />
                          </div>
                        </FormControl>
                        <FormDescription>
                           Withdrawable balance: {isLoading ? <Skeleton className="h-4 w-20 inline-block" /> : formatCurrency(withdrawableBalance)}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Request Withdrawal</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="banking">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>My Payment Details</CardTitle>
              <CardDescription>
                This is the information we will use to send you your withdrawals.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...bankingDetailsForm}>
                <form
                  onSubmit={bankingDetailsForm.handleSubmit(onBankingDetailsSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={bankingDetailsForm.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a payment method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="minipay">Minipay</SelectItem>
                            <SelectItem value="mobile">Mobile Money (Airtel/Safaricom)</SelectItem>
                            <SelectItem value="crypto">Crypto Wallet (BTC, ETH, USDT)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {selectedPaymentMethod === "mobile" && (
                    <FormField
                      control={bankingDetailsForm.control}
                      name="mobileNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 0712345678" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {selectedPaymentMethod === "minipay" && (
                    <FormField
                      control={bankingDetailsForm.control}
                      name="minipayNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minipay Number</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 0781309701" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {selectedPaymentMethod === "crypto" && (
                    <div className="space-y-4">
                      <FormField
                        control={bankingDetailsForm.control}
                        name="cryptoCurrency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cryptocurrency</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        control={bankingDetailsForm.control}
                        name="cryptoAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Wallet Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your wallet address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                  
                  <Button type="submit" className="w-full">Save Details</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
