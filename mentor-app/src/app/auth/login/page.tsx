"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    router.push("/"); // Goes to your Universal Dashboard
    router.refresh();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800 p-4">
      <div className="backdrop-blur-xl bg-white/20 border border-white/30 p-8 rounded-2xl shadow-2xl w-full max-w-md text-white">
        <h2 className="text-3xl font-bold mb-6 text-center">Login</h2>
        
        <input
          type="email"
          placeholder="Email"
          className="w-full mb-3 p-3 rounded-lg bg-white/20 placeholder-white border border-white/30 focus:outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full mb-2 p-3 rounded-lg bg-white/20 placeholder-white border border-white/30 focus:outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="text-right mb-4">
            <Link href="/auth/forgot-password" className="text-yellow-300 text-sm hover:underline">
                Forgot password?
            </Link>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-white text-purple-700 font-bold p-3 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="text-center mt-4 text-sm">
          Dont have an account?{" "}
          <Link href="/auth/signup" className="text-yellow-300 font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}