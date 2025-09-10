
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


const packageSchema = z.object({
  name: z.string().min(1, "Package name is required."),
  price: z.coerce.number().positive("Price must be a positive number."),
  dailyReturn: z.coerce.number().positive("Daily return must be a positive number."),
  duration: z.coerce.number().positive("Duration must be a positive integer."),
  totalReturn: z.coerce.number().positive("Total return must be a positive number."),
});

type PackageFormValues = z.infer<typeof packageSchema>;
type InvestmentPackage = PackageFormValues & { id: string };

export default function ManageInvestmentsPage() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [packages, setPackages] = useState<InvestmentPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    
    const q = query(collection(db, "silverLevelPackages"), orderBy("price"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedPackages: InvestmentPackage[] = [];
        querySnapshot.forEach((doc) => {
            fetchedPackages.push({ id: doc.id, ...doc.data() } as InvestmentPackage);
        });
        setPackages(fetchedPackages);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching packages:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch investment packages." });
        setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin, toast]);

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      name: "",
      price: 0,
      dailyReturn: 0,
      duration: 0,
      totalReturn: 0,
    },
  });

  async function onSubmit(values: PackageFormValues) {
    setFormLoading(true);
    try {
      await addDoc(collection(db, "silverLevelPackages"), values);
      form.reset();
      toast({
        title: "Package Added",
        description: `${values.name} has been successfully created.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: "Could not add the package. Please try again.",
      });
    } finally {
      setFormLoading(false);
    }
  }

  const handleDelete = async (packageId: string) => {
    try {
        await deleteDoc(doc(db, "silverLevelPackages", packageId));
        toast({
            title: "Package Deleted",
            description: "The investment package has been removed.",
        });
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Deletion Failed",
            description: "Could not delete the package. Please try again.",
        });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Investment Packages</h1>
        <p className="text-muted-foreground">
          Add, edit, or remove Silver Level investment packages.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
           <Card>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardHeader>
                  <CardTitle>Add New Package</CardTitle>
                  <CardDescription>
                    Fill out the details for the new investment product.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Package Name</FormLabel><FormControl><Input placeholder="e.g., Silver Level 9" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="price" render={({ field }) => (
                    <FormItem><FormLabel>Price (KES)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="dailyReturn" render={({ field }) => (
                    <FormItem><FormLabel>Daily Return (KES)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="duration" render={({ field }) => (
                    <FormItem><FormLabel>Duration (Days)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="totalReturn" render={({ field }) => (
                    <FormItem><FormLabel>Total Return (KES)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={formLoading}>
                    {formLoading ? <Loader2 className="animate-spin" /> : <PlusCircle />}
                    Add Package
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </div>
        <div className="md:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Existing Packages</CardTitle>
                    <CardDescription>
                        This is the list of investment packages currently available to users.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Daily Return</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center"><Loader2 className="animate-spin"/></TableCell></TableRow>
                            ) : packages.length > 0 ? packages.map((pkg) => (
                                <TableRow key={pkg.id}>
                                    <TableCell className="font-medium">{pkg.name}</TableCell>
                                    <TableCell>{formatCurrency(pkg.price)}</TableCell>
                                    <TableCell>{formatCurrency(pkg.dailyReturn)}</TableCell>
                                    <TableCell>{pkg.duration} Days</TableCell>
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
                                                        This action cannot be undone. This will permanently delete the <strong>{pkg.name}</strong> package.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(pkg.id)} className="bg-destructive hover:bg-destructive/90">
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
                                        No investment packages found. Add one using the form.
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
