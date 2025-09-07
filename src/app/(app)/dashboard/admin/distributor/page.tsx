
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
import { distributorTiers as initialTiers } from "@/lib/config";
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
import { Badge } from "@/components/ui/badge";

const tierSchema = z.object({
  level: z.string().min(1, "Level identifier is required (e.g., V1)."),
  monthlyIncome: z.coerce.number().positive("Monthly income must be a positive number."),
  purchasedProducts: z.coerce.number().int().positive("Purchased products must be a positive integer."),
  deposit: z.coerce.number().positive("Deposit must be a positive number."),
});

type TierFormValues = z.infer<typeof tierSchema>;
type DistributorTier = TierFormValues & { id: string };

export default function ManageDistributorPage() {
  const { toast } = useToast();
  const [tiers, setTiers] = useState<DistributorTier[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // --- Backend Fetching Placeholder ---
    // const fetchedTiers = await getDistributorTiers();
    // setTiers(fetchedTiers);
    setTiers(initialTiers.map((p) => ({ ...p, id: p.level })));
  }, []);

  const form = useForm<TierFormValues>({
    resolver: zodResolver(tierSchema),
    defaultValues: {
      level: "",
      monthlyIncome: 0,
      purchasedProducts: 0,
      deposit: 0,
    },
  });

  async function onSubmit(values: TierFormValues) {
    setLoading(true);
    try {
      // --- Backend Logic Placeholder ---
      // const newTierId = await addDistributorTier(values);
      const newTier = { ...values, id: values.level };
      
      setTiers((prev) => [...prev, newTier]);
      form.reset();

      toast({
        title: "Tier Added",
        description: `Distributor level ${values.level} has been successfully created.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: "Could not add the tier. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (tierId: string) => {
    try {
        // --- Backend Logic Placeholder ---
        // await deleteDistributorTier(tierId);
        setTiers((prev) => prev.filter((p) => p.id !== tierId));
        toast({
            title: "Tier Deleted",
            description: "The distributor tier has been removed.",
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
        <h1 className="text-3xl font-bold tracking-tight">Manage Distributor Tiers</h1>
        <p className="text-muted-foreground">
          Add, edit, or remove Golden Level distributor tiers.
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
                    Fill out the details for the new distributor level.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="level" render={({ field }) => (
                    <FormItem><FormLabel>Level</FormLabel><FormControl><Input placeholder="e.g., V6" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="monthlyIncome" render={({ field }) => (
                    <FormItem><FormLabel>Monthly Income (KES)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="purchasedProducts" render={({ field }) => (
                    <FormItem><FormLabel>Required Products</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="deposit" render={({ field }) => (
                    <FormItem><FormLabel>Deposit (KES)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : <PlusCircle />}
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
                        This is the list of distributor levels currently available to users.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Level</TableHead>
                                <TableHead>Monthly Income</TableHead>
                                <TableHead>Products</TableHead>
                                <TableHead>Deposit</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tiers.length > 0 ? tiers.map((tier) => (
                                <TableRow key={tier.id}>
                                    <TableCell><Badge variant="secondary">{tier.level}</Badge></TableCell>
                                    <TableCell>{formatCurrency(tier.monthlyIncome)}</TableCell>
                                    <TableCell>{tier.purchasedProducts}</TableCell>
                                    <TableCell>{formatCurrency(tier.deposit)}</TableCell>
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
                                                        This action cannot be undone. This will permanently delete the <strong>{tier.level}</strong> tier.
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
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                        No distributor tiers found. Add one using the form.
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
