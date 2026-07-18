/** Registration page: self-signup with validation and inline errors. */
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { APP_NAME } from "@/constants";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/features/auth/validators";
import { useToast } from "@/providers/ToastProvider";

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", full_name: "", password: "", confirm_password: "" },
  });
  const [showPassword, setShowPassword] = useState(false);
  const pwType = showPassword ? "text" : "password";

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      await registerUser({
        email: values.email,
        password: values.password,
        full_name: values.full_name,
      });
      toast("Account created. Welcome!", "success");
      navigate("/dashboard", { replace: true });
    } catch {
      toast("Could not create account. Email may already be in use.", "error");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy-50 px-4">
      <Card className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-navy-800">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-accent">Create your account</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              placeholder="Juan Dela Cruz"
              {...register("full_name")}
            />
            {errors.full_name && (
              <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@school.edu"
              {...register("email")}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={pwType}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="pr-12"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-sm text-accent hover:text-navy-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="confirm_password">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirm_password"
                type={pwType}
                autoComplete="new-password"
                placeholder="Re-enter password"
                className="pr-12"
                {...register("confirm_password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-sm text-accent hover:text-navy-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.confirm_password && (
              <p className="mt-1 text-sm text-red-600">
                {errors.confirm_password.message}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Create Account
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-accent">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-navy-700 hover:underline">
            Sign In
          </Link>
        </p>
      </Card>
    </main>
  );
}
