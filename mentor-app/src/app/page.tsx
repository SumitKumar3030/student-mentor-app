"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

export default function UniversalDashboard() {
  const router = useRouter();
  const [sessionKey, setSessionKey] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const getProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/login");
        return;
      }
      const { data } = await supabase.from("profiles").select("name").eq("id", session.user.id).single();
      setUserName(data?.name || "User");
    };
    getProfile();
  }, [router]);

const handleCreate = async () => {
  const newKey = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  // 1. Get the FRESH session directly
  const { data: { session }, error: authError } = await supabase.auth.getSession();

  if (authError || !session?.user) {
    console.error("Auth Error:", authError);
    alert("Your login session expired. Please log in again.");
    router.push("/auth/login");
    return;
  }

  // 2. Perform the insert using the confirmed user ID
  const { error: dbError } = await supabase.from("sessions").insert([
    { 
      session_key: newKey, 
      created_by: session.user.id, // This MUST match your auth.users table
      is_active: true 
    }
  ]);

  if (dbError) {
    console.error("DB Error Detail:", dbError);
    alert(`Database Error: ${dbError.message}`);
    return;
  }

  // 3. Success! Move to the session
  router.push(`/session/${newKey}?role=mentor`);
};

  const handleJoin = () => {
    if (sessionKey.trim()) {
      router.push(`/session/${sessionKey.toUpperCase()}?role=student`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-extrabold text-white mb-2">Welcome, {userName}</h1>
        <p className="text-gray-400">Choose how you want to start your session today.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* Mentor Card */}
        <div className="backdrop-blur-lg bg-white/5 border border-white/10 p-8 rounded-3xl text-center hover:border-purple-500 transition-all group">
          <div className="text-5xl mb-4">👨‍🏫</div>
          <h2 className="text-2xl font-bold text-white mb-2">I am a Mentor</h2>
          <p className="text-gray-400 mb-6">Create a new session and share your key with students.</p>
          <button onClick={handleCreate} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition">
            Create Session
          </button>
        </div>

        {/* Student Card */}
        <div className="backdrop-blur-lg bg-white/5 border border-white/10 p-8 rounded-3xl text-center hover:border-blue-500 transition-all group">
          <div className="text-5xl mb-4">🎓</div>
          <h2 className="text-2xl font-bold text-white mb-2">I am a Student</h2>
          <input 
            type="text" 
            placeholder="Enter 6-digit Key"
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 mb-4 text-center text-white focus:outline-none focus:border-blue-500 uppercase"
            value={sessionKey}
            onChange={(e) => setSessionKey(e.target.value)}
          />
          <button onClick={handleJoin} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition">
            Join Session
          </button>
        </div>
      </div>
    </div>
  );
}