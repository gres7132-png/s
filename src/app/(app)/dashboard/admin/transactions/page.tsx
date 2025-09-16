
"use client";

import { useEffect, useState, useCallback } from "react";
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
  Timestamp,
  runTransaction,
  getDoc,
  FieldValue,
  updateDoc,
} from "firebase/firestore";
import { formatDistanceToNow } from 'date-fns';
import { formatCurrency } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TAX_FREE_DAY } from "@/lib/config";
import { approveDeposit } from "@/ai/flows/admin-actions";


interface UserDisplayInfo {
    displayName?: string;
    email?: string;
}

interface TransactionProof {
  id: string;
  userId: string;
  proof: string;
  amount: number;
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
  userId: string;
  amount: number;
  requestedAt: Timestamp;
  status: 'pending' | 'approved' | 'rejected';
  paymentDetails: PaymentDetails;
  serviceFee?: number;
}

export default function TransactionsPage() {
  const { toast } = useToast();
  const { isAdmin, loading: authLoading } = useAuth();
  
  const [proofs, setProofs] = useState<TransactionProof[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [userCache, setUserCache] = useState<Record<string, UserDisplayInfo>>({});
  
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [approvalItem, setApprovalItem] = useState<TransactionProof | null>(null);
  const [approvalAmount, setApprovalAmount] = useState<number>(0);

  const fetchUserDetails = useCallback(async (userId: string) => {
    if (userCache[userId]) {
        return userCache[userId];
    }
    try {
        const userDocRef = doc(db, "users", userId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const userData = {
                displayName: userDoc.data().displayName,
                email: userDoc.data().email,
            };
            setUserCache(prev => ({...prev, [userId]: userData}));
            return userData;
        }
    } catch (error) {
        console.error("Failed to fetch user details for cache:", error);
    }
    return { displayName: 'Unknown User', email: '' };
  }, [userCache]);
  

  const handleUpdateWithdrawalStatus = useCallback(async (
    id: string,
    userId: string,
    status: 'approved' | 'rejected'
  ) => {
    setUpdatingId(id);
    const WITHDRAWAL_FEE_RATE = 0.15;
    const isTaxFreeDay = new Date().getDate() === TAX_FREE_DAY;
    
    try {
        await runTransaction(db, async (transaction) => {
            const withdrawalDocRef = doc(db, "withdrawalRequests", id);
            const userStatsDocRef = doc(db, "userStats", userId);

            const withdrawalDoc = await transaction.get(withdrawalDocRef);
            if (!withdrawalDoc.exists()) throw new Error("Withdrawal request not found.");
            
            const userStatsDoc = await transaction.get(userStatsDocRef);
            if (!userStatsDoc.exists()) throw new Error("User stats not found.");

            let updateData: any = { status };
            const requestedAmount = withdrawalDoc.data().amount;

            if (status === 'approved') {
                const serviceFee = isTaxFreeDay ? 0 : requestedAmount * WITHDRAWAL_FEE_RATE;
                updateData.serviceFee = serviceFee;

                const currentBalance = userStatsDoc.data()?.availableBalance || 0;
                if (currentBalance < requestedAmount) {
                    throw new Error("User has insufficient funds for this withdrawal.");
                }

                transaction.update(userStatsDocRef, {
                    availableBalance: FieldValue.increment(-requestedAmount),
                    withdrawalAmount: FieldValue.increment(requestedAmount),
                });
            }

            transaction.update(withdrawalDocRef, updateData);
        });

        toast({
            title: "Status Updated",
            description: `Withdrawal has been ${status}. ${isTaxFreeDay && status === 'approved' ? 'No service fee was charged.' : ''}`,
        });

    } catch (error: any) {
        console.error("Error updating status:", error);
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: error.message || `Could not update the transaction status.`,
        });
    } finally {
        setUpdatingId(null);
    }
  }, [toast]);


  const handleRejectDeposit = async (id: string) => {
      setUpdatingId(id);
      try {
          const proofRef = doc(db, "transactionProofs", id);
          await updateDoc(proofRef, { status: "rejected" });
           toast({
            title: "Status Updated",
            description: `Deposit has been rejected.`,
        });
      } catch (error: any) {
         toast({
            variant: "destructive",
            title: "Update Failed",
            description: error.message || `Could not update the transaction status.`,
        });
      } finally {
          setUpdatingId(null);
      }
  };

  useEffect(() => {
    if (!isAdmin) {
        setLoading(false);
        return;
    };

    setLoading(true);

    const depositsQuery = query(collection(db, "transactionProofs"), orderBy("submittedAt", "desc"));
    const unsubscribeDeposits = onSnapshot(depositsQuery, (snapshot) => {
      const fetchedProofs: TransactionProof[] = [];
      snapshot.forEach(doc => {
          const data = doc.data() as Omit<TransactionProof, 'id'>;
          fetchedProofs.push({ id: doc.id, ...data });
          if(data.userId) fetchUserDetails(data.userId);
      });
      setProofs(fetchedProofs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching transaction proofs:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch deposit proofs." });
      setLoading(false);
    });

    const withdrawalsQuery = query(collection(db, "withdrawalRequests"), orderBy("requestedAt", "desc"));
    const unsubscribeWithdrawals = onSnapshot(withdrawalsQuery, (snapshot) => {
      const fetchedWithdrawals: WithdrawalRequest[] = [];
      snapshot.forEach(doc => {
          const data = doc.data() as Omit<WithdrawalRequest, 'id'>;
          fetchedWithdrawals.push({ id: doc.id, ...data });
          if(data.userId) fetchUserDetails(data.userId);
      });
      setWithdrawals(fetchedWithdrawals);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching withdrawal requests:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch withdrawal requests." });
       setLoading(false);
    });

    return () => {
      unsubscribeDeposits();
      unsubscribeWithdrawals();
    };
  }, [isAdmin, toast, fetchUserDetails]);

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

  const renderActionButtons = (
      type: 'deposit' | 'withdrawal',
      item: TransactionProof | WithdrawalRequest
  ) => {
     if (item.status !== 'pending') return null;
     
     const handleApproveClick = () => {
        if (type === 'deposit') {
            setApprovalItem(item as TransactionProof);
            setApprovalAmount((item as TransactionProof).amount);
        } else {
            handleUpdateWithdrawalStatus(item.id, item.userId, 'approved');
        }
    };


     return (
        <div className="flex gap-2 justify-end">
            {type === 'deposit' ? (
                <AlertDialogTrigger asChild>
                    <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                        onClick={handleApproveClick}
                        disabled={updatingId === item.id}
                    >
                        <CheckCircle className="h-4 w-4 mr-1" /> Approve
                    </Button>
                </AlertDialogTrigger>
            ) : (
                 <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                    onClick={handleApproveClick}
                    disabled={updatingId === item.id}
                >
                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                </Button>
            )}

            <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => {
                    if (type === 'deposit') {
                        handleRejectDeposit(item.id);
                    } else {
                        handleUpdateWithdrawalStatus(item.id, item.userId, 'rejected');
                    }
                }}
                disabled={updatingId === item.id}
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

  const handleApprovalDialogCancel = () => {
    setApprovalItem(null);
    setApprovalAmount(0);
  };

  const handleApprovalDialogConfirm = async () => {
    if (!approvalItem) return;
    setUpdatingId(approvalItem.id);
    try {
        await approveDeposit({
            proofId: approvalItem.id,
            verifiedAmount: approvalAmount,
        });
        toast({
            title: "Status Updated",
            description: `Deposit has been approved.`,
        });
    } catch (error: any) {
         toast({
            variant: "destructive",
            title: "Update Failed",
            description: error.message || `Could not approve the deposit.`,
        });
    } finally {
        setUpdatingId(null);
        setApprovalItem(null);
        setApprovalAmount(0);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Approve Transactions</h1>
        <p className="text-muted-foreground">
          Review and approve or reject user deposits and withdrawals.
        </p>
      </div>

    <AlertDialog>
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
                    <CardDescription>Verify payments, then approve with the correct amount to credit the user's account and award referral commission.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Submitted</TableHead>
                                <TableHead>Proof/ID</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
                            ) : proofs.length > 0 ? (
                                proofs.map((proof) => (
                                <TableRow key={proof.id} className={updatingId === proof.id ? 'opacity-50' : ''}>
                                    <TableCell className="font-medium">{userCache[proof.userId]?.displayName || 'Loading...'}</TableCell>
                                     <TableCell>{formatCurrency(proof.amount)}</TableCell>
                                    <TableCell className="text-muted-foreground">{proof.submittedAt ? formatDistanceToNow(proof.submittedAt.toDate(), { addSuffix: true }) : 'Just now'}</TableCell>
                                    <TableCell className="font-mono text-xs break-all">{proof.proof}</TableCell>
                                    <TableCell>{renderStatusBadge(proof.status)}</TableCell>
                                    <TableCell className="text-right">{renderActionButtons('deposit', proof)}</TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No deposit proofs submitted yet.</TableCell></TableRow>
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
                    <CardDescription>Approve to deduct funds. The 15% service fee will be waived automatically if today is the 23rd of the month. You must manually send the final amount to the user.</CardDescription>
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
                             {loading ? (
                                <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
                            ) : withdrawals.length > 0 ? (
                                withdrawals.map((req) => (
                                <TableRow key={req.id} className={updatingId === req.id ? 'opacity-50' : ''}>
                                    <TableCell className="font-medium">{userCache[req.userId]?.displayName || 'Loading...'}</TableCell>
                                    <TableCell className="text-muted-foreground">{req.requestedAt ? formatDistanceToNow(req.requestedAt.toDate(), { addSuffix: true }) : 'Just now'}</TableCell>
                                    <TableCell className="font-medium">{formatCurrency(req.amount)}</TableCell>
                                    <TableCell>{renderPaymentDetails(req.paymentDetails)}</TableCell>
                                    <TableCell>{renderStatusBadge(req.status)}</TableCell>
                                    <TableCell className="text-right">{renderActionButtons('withdrawal', req)}</TableCell>
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
      
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Approval</AlertDialogTitle>
                <AlertDialogDescription>
                    Verify the amount for this transaction. The user's account will be updated with the value you enter below.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="approval-amount" className="text-right">
                        Amount (KES)
                    </Label>
                    <Input
                        id="approval-amount"
                        type="number"
                        value={approvalAmount}
                        onChange={(e) => setApprovalAmount(parseFloat(e.target.value) || 0)}
                        className="col-span-3"
                    />
                </div>
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={handleApprovalDialogCancel}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleApprovalDialogConfirm} disabled={updatingId === approvalItem?.id}>
                    {updatingId ? <Loader2 className="animate-spin" /> : "Confirm & Approve"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>

      </AlertDialog>
    </div>
  );
}

    