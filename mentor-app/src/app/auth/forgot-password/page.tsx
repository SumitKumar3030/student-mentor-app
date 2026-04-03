"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Check your email for the reset link!");
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800 p-4">
      <div className="backdrop-blur-xl bg-white/20 border border-white/30 p-8 rounded-2xl shadow-2xl w-full max-w-md text-white">
        <h2 className="text-3xl font-bold mb-6 text-center">Reset Password</h2>
        
        <p className="text-sm text-center mb-6 text-white/80">
          Enter your email and we will send you a link to get back into your account.
        </p>

        <input
          type="email"
          placeholder="Enter your email"
          className="w-full mb-4 p-3 rounded-lg bg-white/20 placeholder-white border border-white/30 focus:outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          onClick={handleReset}
          disabled={loading}
          className="w-full bg-white text-purple-700 font-bold p-3 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>

        <p className="text-center mt-4 text-sm">
          Remember your password?{" "}
          <Link href="/auth/login" className="text-yellow-300 font-semibold hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}