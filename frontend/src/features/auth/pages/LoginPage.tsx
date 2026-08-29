/** Login page: email + password form with validation and inline errors. */
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { apiErrorMessage } from "@/api/errors";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { APP_NAME } from "@/constants";
import { useAuth } from "@/features/auth/context/AuthContext";
import { dashboardPathForRoles } from "@/features/dashboards/routeForRole";
import { loginSchema, type LoginFormValues } from "@/features/auth/validators";
import { useToast } from "@/providers/ToastProvider";

export default function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const redirectTo = from ?? dashboardPathForRoles(user?.roles);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const [showPassword, setShowPassword] = useState(false);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy-50 px-4 dark:bg-navy-950">
        <div className="flex items-center gap-3 text-navy-600 dark:text-navy-300">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-navy-800 border-t-transparent dark:border-navy-200 dark:border-t-transparent" />
          <span>Loading...</span>
        </div>
      </main>
    );
  }

  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values.email, values.password);
      toast("Welcome back!", "success");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast(apiErrorMessage(error, "Invalid email or password."), "error");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy-50 px-4 dark:bg-navy-950">
      <Card className="w-full max-w-md border-navy-100 bg-white shadow-sm dark:border-navy-800 dark:bg-navy-900 dark:shadow-none">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-navy-800 dark:text-white">{APP_NAME}</h1>
          <p className="mt-2 text-sm text-navy-500 dark:text-navy-300">Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@college.edu"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-red-600" role="alert">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                className="pr-12"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-navy-500 hover:text-navy-700 dark:text-navy-300 dark:hover:text-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-600" role="alert">{errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Sign In
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-navy-500 dark:text-navy-300">
          Accounts are issued by the College administrator.
        </p>
      </Card>
    </main>
  );
}
