
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, ShieldAlert } from "lucide-react";
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

interface TransactionProof {
  id: string;
  userName: string;
  proof: string;
  submittedAt: Timestamp;
  status: 'pending' | 'approved' | 'rejected';
}

export default function TransactionsPage() {
  const { toast } = useToast();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [proofs, setProofs] = useState<TransactionProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;

    setLoading(true);
    const q = query(collection(db, "transactionProofs"), orderBy("submittedAt", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedProofs: TransactionProof[] = [];
      querySnapshot.forEach((doc) => {
        fetchedProofs.push({ id: doc.id, ...doc.data() } as TransactionProof);
      });
      setProofs(fetchedProofs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching transaction proofs:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch transaction proofs.",
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin, toast]);

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    setUpdatingId(id);
    try {
      const proofRef = doc(db, "transactionProofs", id);
      await updateDoc(proofRef, { status });
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transaction Proofs</h1>
        <p className="text-muted-foreground">
          Review and approve or reject deposit transaction proofs submitted by users.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Submissions</CardTitle>
          <CardDescription>
            This list is updated in real-time as users submit new proofs.
          </CardDescription>
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : proofs.length > 0 ? (
                proofs.map((proof) => (
                  <TableRow key={proof.id} className={updatingId === proof.id ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{proof.userName}</TableCell>
                    <TableCell className="text-muted-foreground">
                        {proof.submittedAt ? formatDistanceToNow(proof.submittedAt.toDate(), { addSuffix: true }) : 'Just now'}
                    </TableCell>
                    <TableCell className="font-mono text-xs break-all">{proof.proof}</TableCell>
                    <TableCell>
                      <Badge variant={proof.status === 'approved' ? 'default' : proof.status === 'rejected' ? 'destructive' : 'secondary'}>
                        {proof.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        {proof.status === 'pending' && (
                            <div className="flex gap-2 justify-end">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                                    onClick={() => handleUpdateStatus(proof.id, 'approved')}
                                    disabled={updatingId === proof.id}
                                >
                                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700"
                                    onClick={() => handleUpdateStatus(proof.id, 'rejected')}
                                    disabled={updatingId === proof.id}
                                >
                                    <XCircle className="h-4 w-4 mr-1" /> Reject
                                </Button>
                            </div>
                        )}
                        {updatingId === proof.id && <Loader2 className="h-4 w-4 animate-spin" />}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No transaction proofs submitted yet.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
