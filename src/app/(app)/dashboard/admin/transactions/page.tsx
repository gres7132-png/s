
"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, ShieldAlert, ArrowUpCircle, ArrowDownCircle, Info } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { formatDistanceToNow } from 'date-fns';
import { formatCurrency } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface TransactionProof {
  id: string;
  userName: string;
  proof: string;
  submittedAt: Timestamp;
  status: 'pending' | 'approved' | 'rejected';
}

interface PaymentDetails {
    paymentMethod: 'mobile' | 'crypto' | 'minipay';
    mobileNumber?: string;
    minipayNumber?: string;
    cryptoCurrency?: 'BTC' | 'ETH' | 'USDT';
    cryptoAddress?: string;
}

interface WithdrawalRequest {
  id: string;
  userName: string;
  amount: number;
  requestedAt: Timestamp;
  status: 'pending' | 'approved' | 'rejected';
  paymentDetails: PaymentDetails;
}

export default function TransactionsPage() {
  const { toast } = useToast();
  const { isAdmin, loading: authLoading } = useAuth();
  
  const [proofs, setProofs] = useState<TransactionProof[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  
  const [loadingDeposits, setLoadingDeposits] = useState(true);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true);
  
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;

    const depositsQuery = query(collection(db, "transactionProofs"), orderBy("submittedAt", "desc"));
    const unsubscribeDeposits = onSnapshot(depositsQuery, (querySnapshot) => {
      const fetchedProofs: TransactionProof[] = [];
      querySnapshot.forEach((doc) => {
        fetchedProofs.push({ id: doc.id, ...doc.data() } as TransactionProof);
      });
      setProofs(fetchedProofs);
      setLoadingDeposits(false);
    }, (error) => {
      console.error("Error fetching transaction proofs:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch deposit proofs." });
      setLoadingDeposits(false);
    });

    const withdrawalsQuery = query(collection(db, "withdrawalRequests"), orderBy("requestedAt", "desc"));
    const unsubscribeWithdrawals = onSnapshot(withdrawalsQuery, (querySnapshot) => {
      const fetchedWithdrawals: WithdrawalRequest[] = [];
      querySnapshot.forEach((doc) => {
        fetchedWithdrawals.push({ id: doc.id, ...doc.data() } as WithdrawalRequest);
      });
      setWithdrawals(fetchedWithdrawals);
      setLoadingWithdrawals(false);
    }, (error) => {
      console.error("Error fetching withdrawal requests:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch withdrawal requests." });
      setLoadingWithdrawals(false);
    });

    return () => {
      unsubscribeDeposits();
      unsubscribeWithdrawals();
    };
  }, [isAdmin, toast]);

  const handleUpdateStatus = async (collectionName: string, id: string, status: 'approved' | 'rejected') => {
    setUpdatingId(id);
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, { status });
      toast({
        title: "Status Updated",
        description: `Transaction has been ${status}.`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update the transaction status.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  if (authLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!isAdmin) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <ShieldAlert className="h-12 w-12 text-destructive" />
            <h1 className="text-2xl font-bold mt-4">Access Denied</h1>
            <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
    );
  }

  const renderStatusBadge = (status: 'pending' | 'approved' | 'rejected') => (
     <Badge variant={status === 'approved' ? 'default' : status === 'rejected' ? 'destructive' : 'secondary'}>
        {status}
      </Badge>
  );

  const renderActionButtons = (collection: string, id: string, status: 'pending' | 'approved' | 'rejected') => {
     if (status !== 'pending') return null;
     return (
        <div className="flex gap-2 justify-end">
            <Button
                size="sm"
                variant="outline"
                className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                onClick={() => handleUpdateStatus(collection, id, 'approved')}
                disabled={updatingId === id}
            >
                <CheckCircle className="h-4 w-4 mr-1" /> Approve
            </Button>
            <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => handleUpdateStatus(collection, id, 'rejected')}
                disabled={updatingId === id}
            >
                <XCircle className="h-4 w-4 mr-1" /> Reject
            </Button>
        </div>
     );
  };
  
  const renderPaymentDetails = (details: PaymentDetails) => {
    let detailText: string;
    switch (details.paymentMethod) {
        case 'mobile': detailText = `Mobile: ${details.mobileNumber}`; break;
        case 'minipay': detailText = `Minipay: ${details.minipayNumber}`; break;
        case 'crypto': detailText = `${details.cryptoCurrency}: ${details.cryptoAddress}`; break;
        default: detailText = 'No details';
    }
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="flex items-center gap-1 cursor-pointer">
                        <Info className="h-4 w-4 text-muted-foreground" /> 
                        {details.paymentMethod}
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="font-mono text-xs">{detailText}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
  };


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Approve Transactions</h1>
        <p className="text-muted-foreground">
          Review and approve or reject user deposits and withdrawals.
        </p>
      </div>

       <Tabs defaultValue="deposits">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deposits">
                <ArrowUpCircle className="mr-2 h-4 w-4" />Deposits
            </TabsTrigger>
            <TabsTrigger value="withdrawals">
                <ArrowDownCircle className="mr-2 h-4 w-4" />Withdrawals
            </TabsTrigger>
        </TabsList>
        <TabsContent value="deposits">
            <Card>
                <CardHeader>
                    <CardTitle>Deposit Proofs</CardTitle>
                    <CardDescription>Users submit these proofs after making a deposit. You must manually verify the payment in the corresponding payment system before approving. Approving will credit the user's account.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Submitted</TableHead>
                                <TableHead>Proof/ID</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingDeposits ? (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
                            ) : proofs.length > 0 ? (
                                proofs.map((proof) => (
                                <TableRow key={proof.id} className={updatingId === proof.id ? 'opacity-50' : ''}>
                                    <TableCell className="font-medium">{proof.userName}</TableCell>
                                    <TableCell className="text-muted-foreground">{proof.submittedAt ? formatDistanceToNow(proof.submittedAt.toDate(), { addSuffix: true }) : 'Just now'}</TableCell>
                                    <TableCell className="font-mono text-xs break-all">{proof.proof}</TableCell>
                                    <TableCell>{renderStatusBadge(proof.status)}</TableCell>
                                    <TableCell className="text-right">{renderActionButtons("transactionProofs", proof.id, proof.status)}</TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No deposit proofs submitted yet.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="withdrawals">
             <Card>
                <CardHeader>
                    <CardTitle>Withdrawal Requests</CardTitle>
                    <CardDescription>Users request to withdraw funds. Verify the user's account and process the payment to their saved details. Approving will deduct the funds from their account.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Requested</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Payment Details</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {loadingWithdrawals ? (
                                <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
                            ) : withdrawals.length > 0 ? (
                                withdrawals.map((req) => (
                                <TableRow key={req.id} className={updatingId === req.id ? 'opacity-50' : ''}>
                                    <TableCell className="font-medium">{req.userName}</TableCell>
                                    <TableCell className="text-muted-foreground">{req.requestedAt ? formatDistanceToNow(req.requestedAt.toDate(), { addSuffix: true }) : 'Just now'}</TableCell>
                                    <TableCell className="font-medium">{formatCurrency(req.amount)}</TableCell>
                                    <TableCell>{renderPaymentDetails(req.paymentDetails)}</TableCell>
                                    <TableCell>{renderStatusBadge(req.status)}</TableCell>
                                    <TableCell className="text-right">{renderActionButtons("withdrawalRequests", req.id, req.status)}</TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No withdrawal requests yet.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
