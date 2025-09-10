
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { Loader2, ShieldAlert, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { listAllUsers, UserData } from "@/ai/flows/user-management";


export default function UsersListPage() {
  const { toast } = useToast();
  const { isAdmin, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
        setLoading(false);
        return;
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // This now calls our secure backend flow to get users.
            const fetchedData = await listAllUsers();
            setUsers(fetchedData.users);
        } catch(error: any) {
             toast({
                variant: "destructive",
                title: "Failed to Fetch Users",
                description: error.message || "Could not retrieve the user list.",
            });
        } finally {
            setLoading(false);
        }
    };

    fetchUsers();
  }, [isAdmin, toast]);

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
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          View and manage all registered users on the platform.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            A list of all users who have registered an account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Display Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>User ID</TableHead>
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
              ) : users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell className="font-medium">{user.displayName || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="font-mono text-xs">{user.uid}</TableCell>
                    <TableCell>
                      <Badge variant={user.disabled ? 'destructive' : 'default'}>
                        {user.disabled ? 'Suspended' : 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/admin/users/${user.uid}`}>
                                View Details <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No users found. This feature requires the Firebase Admin SDK on the backend.
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
