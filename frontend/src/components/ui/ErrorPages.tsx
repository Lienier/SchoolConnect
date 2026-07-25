import { Link } from "react-router-dom";
import { type ReactNode } from "react";
import { cn } from "@/utils/cn";
import { Button } from "./Button";
import { Home, RotateCcw, Lock, AlertCircle, Server, WifiOff } from "lucide-react";

interface ErrorPageProps {
  title: string;
  description: string;
  icon: ReactNode;
  action?: ReactNode;
  showBackLink?: boolean;
  className?: string;
}

export function ErrorPage({ title, description, icon, action, showBackLink = true, className }: ErrorPageProps) {
  return (
    <div className={cn("min-h-screen flex items-center justify-center bg-navy-50 px-4", className)}>
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-navy-100 text-navy-600">
          {icon}
        </div>
        <h1 className="mb-3 text-3xl font-bold text-navy-900">{title}</h1>
        <p className="mb-6 text-navy-500">{description}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {action}
          {showBackLink && (
            <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-navy-700 hover:text-navy-900">
              <Home className="h-4 w-4" />
              Go Home
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <ErrorPage
      title="Page Not Found"
      description="Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist."
      icon={<AlertCircle className="h-10 w-10" />}
    />
  );
}

export function UnauthorizedPage() {
  return (
    <ErrorPage
      title="Unauthorized"
      description="You need to sign in to access this page. Please log in with your credentials."
      icon={<Lock className="h-10 w-10" />}
      action={
        <Link to="/login">
          <Button>Sign In</Button>
        </Link>
      }
    />
  );
}

export function ForbiddenPage() {
  return (
    <ErrorPage
      title="Access Denied"
      description="You don't have permission to access this page. Contact your administrator if you believe this is an error."
      icon={<Lock className="h-10 w-10" />}
      action={
        <Link to="/">
          <Button variant="secondary">Go Home</Button>
        </Link>
      }
    />
  );
}

export function ServerErrorPage() {
  return (
    <ErrorPage
      title="Server Error"
      description="Something went wrong on our end. Our team has been notified and we're working to fix it."
      icon={<Server className="h-10 w-10" />}
      action={
        <>
          <Button onClick={() => window.location.reload()}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Link to="/">
            <Button variant="secondary">Go Home</Button>
          </Link>
        </>
      }
    />
  );
}

export function MaintenancePage() {
  return (
    <ErrorPage
      title="Under Maintenance"
      description="We're currently performing scheduled maintenance. Please check back later."
      icon={<RotateCcw className="h-10 w-10 animate-spin" />}
      showBackLink={false}
    />
  );
}

export function OfflinePage() {
  return (
    <ErrorPage
      title="You're Offline"
      description="It looks like you've lost your internet connection. Please check your connection and try again."
      icon={<WifiOff className="h-10 w-10" />}
      action={
        <Button onClick={() => window.location.reload()}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      }
    />
  );
}