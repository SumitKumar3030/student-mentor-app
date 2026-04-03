"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").insert([
        {
          id: data.user.id,
          name,
          role: "user", // Default neutral role
        },
      ]);
    }

    alert("Signup successful! Please check your email for confirmation.");
    router.push("/auth/login");
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800 p-4">
      <div className="backdrop-blur-xl bg-white/20 border border-white/30 p-8 rounded-2xl shadow-2xl w-full max-w-md text-white">
        <h2 className="text-3xl font-bold mb-6 text-center">Create Account</h2>
        <input
          type="text"
          placeholder="Full Name"
          className="w-full mb-3 p-3 rounded-lg bg-white/20 placeholder-white border border-white/30 focus:outline-none"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
          className="w-full mb-6 p-3 rounded-lg bg-white/20 placeholder-white border border-white/30 focus:outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          onClick={handleSignup}
          disabled={loading}
          className="w-full bg-white text-purple-700 font-bold p-3 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
        >
          {loading ? "Creating..." : "Sign Up"}
        </button>
        <p className="text-center mt-4 text-sm">
          Already have an account? <Link href="/auth/login" className="text-yellow-300 font-semibold">Login</Link>
        </p>
      </div>
    </div>
  );
}