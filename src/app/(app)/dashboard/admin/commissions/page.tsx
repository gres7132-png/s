
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
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
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";


const tierSchema = z.object({
  referrals: z.coerce.number().int().positive("Referrals must be a positive integer."),
  commission: z.coerce.number().positive("Commission must be a positive number."),
});

type TierFormValues = z.infer<typeof tierSchema>;
type CommissionTier = TierFormValues & { id: string };

export default function ManageCommissionsPage() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [tiers, setTiers] = useState<CommissionTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  const form = useForm<TierFormValues>({
    resolver: zodResolver(tierSchema),
    defaultValues: {
      referrals: 0,
      commission: 0,
    },
  });

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, "commissionTiers"), orderBy("referrals"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedTiers: CommissionTier[] = [];
      querySnapshot.forEach((doc) => {
        fetchedTiers.push({ id: doc.id, ...doc.data() } as CommissionTier);
      });
      setTiers(fetchedTiers);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching commission tiers:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch commission tiers." });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin, toast]);

  async function onSubmit(values: TierFormValues) {
    setFormLoading(true);
    try {
      await addDoc(collection(db, "commissionTiers"), values);
      form.reset({ referrals: 0, commission: 0 });
      toast({
        title: "Tier Added",
        description: `Commission tier for ${values.referrals} referrals has been created.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: "Could not add the tier. Please try again.",
      });
    } finally {
      setFormLoading(false);
    }
  }

  const handleDelete = async (tierId: string) => {
    try {
        await deleteDoc(doc(db, "commissionTiers", tierId));
        toast({
            title: "Tier Deleted",
            description: "The commission tier has been removed.",
        });
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Deletion Failed",
            description: "Could not delete the tier. Please try again.",
        });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Commission Tiers</h1>
        <p className="text-muted-foreground">
          Add, edit, or remove agent monthly commission tiers.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
           <Card>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardHeader>
                  <CardTitle>Add New Tier</CardTitle>
                  <CardDescription>
                    Define a new commission level for agents.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="referrals" render={({ field }) => (
                    <FormItem><FormLabel>Required Referrals</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="commission" render={({ field }) => (
                    <FormItem><FormLabel>Monthly Commission (KES)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={formLoading}>
                    {formLoading ? <Loader2 className="animate-spin" /> : <PlusCircle />}
                    Add Tier
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </div>
        <div className="md:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Existing Tiers</CardTitle>
                    <CardDescription>
                        This is the list of commission tiers for referring active investors.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Required Referrals</TableHead>
                                <TableHead>Monthly Commission</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={3} className="text-center"><Loader2 className="animate-spin"/></TableCell></TableRow>
                            ) : tiers.length > 0 ? tiers.map((tier) => (
                                <TableRow key={tier.id}>
                                    <TableCell className="font-medium">{tier.referrals}+</TableCell>
                                    <TableCell>{formatCurrency(tier.commission)}</TableCell>
                                    <TableCell className="text-right">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                 <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the tier for <strong>{tier.referrals} referrals</strong>.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(tier.id)} className="bg-destructive hover:bg-destructive/90">
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                                        No commission tiers found. Add one using the form.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
