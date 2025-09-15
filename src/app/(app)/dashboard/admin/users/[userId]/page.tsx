
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, useCallback } from "react";
import { Activity, ArrowDown, ArrowUp, Ban, CheckCircle, DollarSign, Info, Loader2, Pencil, ShieldAlert, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { updateUserStatus } from "@/ai/flows/user-management";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { doc, getDoc, onSnapshot, collection, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { updateBalance, updateInvestment, deleteInvestment } from "@/ai/flows/admin-actions";
import { Skeleton } from "@/components/ui/skeleton";


// --- Data Interfaces ---
interface UserData {
  uid: string;
  email?: string;
  displayName?: string;
  disabled: boolean;
}

interface UserStats {
  availableBalance: number;
  todaysEarnings: number;
  rechargeAmount: number;
  withdrawalAmount: number;
}

const balanceSchema = z.object({
  availableBalance: z.coerce.number().min(0, "Balance cannot be negative."),
});
type BalanceFormValues = z.infer<typeof balanceSchema>;

const investmentSchema = z.object({
  price: z.coerce.number().positive(),
  dailyReturn: z.coerce.number().positive(),
  status: z.enum(["active", "completed"]),
});
type InvestmentFormValues = z.infer<typeof investmentSchema>;

interface Investment extends InvestmentFormValues {
    id: string;
    name: string;
    startDate: Timestamp;
    duration: number;
}


export default function UserDetailsPage({ params }: { params: { userId: string } }) {
  const { userId } = params;
  const { toast } = useToast();
  const { isAdmin, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);

  const balanceForm = useForm<BalanceFormValues>();
  const investmentForm = useForm<InvestmentFormValues>({ resolver: zodResolver(investmentSchema) });

  const fetchUserData = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
        const userDocRef = doc(db, "users", userId);
        // In a real app, this would be a backend call to get the user record from Firebase Auth
        // As a workaround, we'll optimistically update the state and revert on error.
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            const data = userDoc.data();
            setUser({ 
                uid: userDoc.id, 
                displayName: data.displayName,
                email: data.email,
                // The disabled status is managed optimistically in state
                // after an admin action, not fetched directly.
                disabled: user?.disabled || false,
            });
        } else {
             toast({ variant: "destructive", title: "User Not Found" });
        }
    } catch(e: any) {
        toast({ variant: "destructive", title: "Failed to fetch user data", description: e.message });
    } finally {
        setLoading(false);
    }
  }, [userId, toast, isAdmin, user?.disabled]);

  useEffect(() => {
    if (!isAdmin || !userId) return;

    fetchUserData();

    // Real-time listener for user stats
    const userStatsRef = doc(db, "userStats", userId);
    const unsubStats = onSnapshot(userStatsRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data() as UserStats;
            setStats(data);
            balanceForm.reset({ availableBalance: data.availableBalance || 0 });
        } else {
            setStats({ availableBalance: 0, todaysEarnings: 0, rechargeAmount: 0, withdrawalAmount: 0 });
        }
    });

    // Real-time listener for user investments
    const investmentsQuery = query(collection(db, `users/${userId}/investments`), orderBy("startDate", "desc"));
    const unsubInvestments = onSnapshot(investmentsQuery, (snapshot) => {
        const fetchedInvestments: Investment[] = [];
        snapshot.forEach(doc => {
            fetchedInvestments.push({ id: doc.id, ...doc.data() } as Investment);
        });
        setInvestments(fetchedInvestments);
    });

    return () => {
        unsubStats();
        unsubInvestments();
    };
  }, [userId, isAdmin, fetchUserData, balanceForm]);


  async function onBalanceSubmit(values: BalanceFormValues) {
    setActionLoading(true);
    try {
      await updateBalance({ userId, newBalance: values.availableBalance });
      toast({ title: "Balance Updated", description: "The user's balance has been successfully changed."});
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
    } finally {
      setActionLoading(false);
    }
  }

  const handleToggleSuspend = async () => {
    if (!user) return;
    setActionLoading(true);
    const newStatus = !user.disabled;
    try {
        await updateUserStatus({ uid: user.uid, disabled: newStatus });
        setUser(prev => prev ? {...prev, disabled: newStatus } : null);
        toast({
            title: `User ${newStatus ? 'Suspended' : 'Reactivated'}`,
            description: `${user.displayName || user.email} has been ${newStatus ? 'suspended' : 'reactivated'}.`
        });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Action Failed", description: error.message });
        setUser(prev => prev ? {...prev, disabled: !newStatus } : null); // Revert on error
    } finally {
        setActionLoading(false);
    }
  };

  const handleEditInvestment = (investment: Investment) => {
    setEditingInvestment(investment);
    investmentForm.reset({
      price: investment.price,
      dailyReturn: investment.dailyReturn,
      status: investment.status,
    });
  };

  const handleUpdateInvestment = async (values: InvestmentFormValues) => {
    if (!editingInvestment) return;
    setActionLoading(true);
    try {
      await updateInvestment({
        userId,
        investmentId: editingInvestment.id,
        ...values,
      });
      toast({ title: "Investment Updated" });
      setEditingInvestment(null);
    } catch (e: any