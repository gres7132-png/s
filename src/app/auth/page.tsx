
import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

function AuthLoading() {
  return (
    <div className="w-full max-w-md space-y-4">
      <Skeleton className="h-10 w-full" />
      <div className="space-y-6 rounded-lg border bg-card p-6">
        <Skeleton className="h-8 w-1/3" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

export default function AuthenticationPage() {
  return (
    <>
      <Link
        href="/website"
        className={buttonVariants({
          variant: "ghost",
          className: "absolute left-4 top-4 md:left-8 md:top-8",
        })}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Website
      </Link>
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="flex items-center gap-2 mb-8">
          <Logo className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-primary">YieldLink</h1>
        </div>
        <Suspense fallback={<AuthLoading />}>
          <AuthForm />
        </Suspense>
      </div>
    </>
  );
}
