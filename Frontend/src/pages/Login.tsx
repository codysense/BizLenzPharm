import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, TrendingUp, Wallet, FileBarChart } from "lucide-react";
import { authApi } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";

// Import your uploaded logo
import bizlensLogo from "../assets/BizLens-white-logo.png";
import bizlensLogoNobg from "../assets/Bizlens logo-nobg.png";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const Login = () => {
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      const response: any = await authApi.login(data.email, data.password);
      setAuth(response.user, response.accessToken, response.refreshToken);
      toast.success("Welcome back!");
      navigate("/");
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-light-lavender">
      {/* LEFT SIDE - Similar to Termii layout */}
      <div className="hidden lg:flex flex-col justify-between bg-emerald-600 text-lavender p-10 xl:p-16">
        <div>
          <img
            src={bizlensLogo}
            alt="BizLens Logo"
            className="h-32 object-contain mb-4"
          />

          <h1 className="text-4xl font-bold leading-tight mb-4 text-white">
            Control Everything. <br /> Miss Nothing.
          </h1>

          <p className="text-lg text-white/80 max-w-md">
            Track income, expenses, invoices, inventory, and financial growth
            from one powerful accounting dashboard.
          </p>
        </div>

        {/* Accounting Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-10">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 transform transition-all duration-300 hover:-translate-y-2 hover:bg-white/20 hover:shadow-lg cursor-pointer">
            <Wallet className="h-8 w-8 mb-3" />
            <h3 className="text-2xl font-bold">₦2.4B+</h3>
            <p className="text-sm text-lavender/70">Transactions Managed</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 transform transition-all duration-300 hover:-translate-y-2 hover:bg-white/20 hover:shadow-lg cursor-pointer">
            <FileBarChart className="h-8 w-8 mb-3" />
            <h3 className="text-2xl font-bold">98%</h3>
            <p className="text-sm text-lavender/70">
              Faster Financial Reporting
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 transform transition-all duration-300 hover:-translate-y-2 hover:bg-white/20 hover:shadow-lg cursor-pointer">
            <TrendingUp className="h-8 w-8 mb-3" />
            <h3 className="text-2xl font-bold">5,000+</h3>
            <p className="text-sm text-white/70">Businesses Growing</p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Login Form */}
      <div className="flex items-center justify-center px-6 sm:px-10 py-2">
        <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8">
          <div className="text-center mb-4 lg:hidden">
            <img
              src={bizlensLogoNobg}
              alt="BizLens"
              className="h-32 mx-auto object-contain"
            />
          </div>

          <h2 className="text-3xl font-bold text-emerald-600 mb-2">
            Welcome Back
          </h2>
          <p className="text-gray-500 mb-8">
            Sign in to access your accounting dashboard
          </p>

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                {...register("email")}
                type="email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="text-sm text-rose mt-2">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter your password"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-500" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-500" />
                  )}
                </button>
              </div>

              {errors.password && (
                <p className="text-sm text-rose mt-2">
                  {errors.password.message}
                </p>
              )}

              {/*<div className="flex items-center justify-between mt-4">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Remember Me
                </label>

                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                >
                  Forgot Password?
                </Link>
              </div>*/}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition duration-200 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
