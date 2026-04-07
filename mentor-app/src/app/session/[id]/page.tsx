"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import Editor from "@monaco-editor/react";
import { supabase } from "@/app/lib/supabaseClient";

// 1. Define strict interfaces for Type Safety
interface SessionMessage {
  sessionKey: string;
  message: string;
  senderRole: string;
  timestamp: string;
}

export default function UnifiedSession() {
  const params = useParams();
  const sessionKey = params.id as string;
  const searchParams = useSearchParams();
  const router = useRouter();

  // Role defaults to student if not provided
  const role = searchParams.get("role") || "student";

  // --- State Management ---
  const [code, setCode] = useState("// Loading shared editor...");
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  // --- Refs for Persistence ---
  const socketRef = useRef<Socket | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // --- Media Controls ---
  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMicOn(!isMicOn);
    }
  };

  const toggleCam = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsCamOn(!isCamOn);
    }
  };

  const endCall = useCallback(() => {
    if (window.confirm("Are you sure you want to leave the session?")) {
      router.push("/");
    }
  }, [router]);

  // --- Socket Emitters ---
  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    socketRef.current?.emit("language-change", {
      sessionKey,
      language: newLang,
    });
  };

  const handleCodeChange = (value: string | undefined) => {
    const updated = value || "";
    setCode(updated);
    socketRef.current?.emit("code-change", {
      sessionKey,
      code: updated,
    });
  };

  const sendChat = () => {
    if (!inputMsg.trim()) return;

    const msg: SessionMessage = {
      sessionKey,
      message: inputMsg,
      senderRole: role,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Send to others
    socketRef.current?.emit("send-message", msg);
    // Add to local UI (since socket.to doesn't send back to sender)
    setMessages((prev) => [...prev, msg]);
    setInputMsg("");
  };

  // --- Core Lifecycle ---
useEffect(() => {
  let currentSocket: Socket | null = null;
  let currentPeer: RTCPeerConnection | null = null;
  let currentStream: MediaStream | null = null;

  const initSession = async () => {
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .eq("session_key", sessionKey)
      .single();

    if (!data) {
      alert("Session not found ❌");
      router.push("/");
      return;
    }

    // ✅ SOCKET
    const socket = io("https://student-mentor-app-18ym.onrender.com", {
  transports: ["websocket"],
});
    socketRef.current = socket;
    currentSocket = socket;

    // ✅ PEER
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: "turn:openrelay.metered.ca:80",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
        {
          urls: "turn:openrelay.metered.ca:443",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
      ],
    });

    pc.current = peer;
    currentPeer = peer;

    // ✅ MEDIA
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;
      currentStream = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    } catch (err) {
      console.error("Camera error:", err);
    }

socket.emit("join-session", sessionKey);

socket.on("user-joined", async () => {
  if (role === "mentor") {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit("offer", { sessionKey, offer });
  }
});

socket.on("offer", async (offer) => {
  if (role === "student") {
    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socket.emit("answer", { sessionKey, answer });
  }
});

socket.on("answer", async (answer) => {
  if (peer.signalingState !== "stable") {
    await peer.setRemoteDescription(new RTCSessionDescription(answer));
  }
});

socket.on("ice-candidate", async (candidate) => {
  if (peer.remoteDescription) {
    await peer.addIceCandidate(new RTCIceCandidate(candidate));
  }
});

// ✅ CODE SYNC
socket.on("receive-code", (newCode: string) => {
  setCode(newCode);
});

// ✅ LANGUAGE SYNC
socket.on("receive-language", (newLang: string) => {
  setLanguage(newLang);
});

// ✅ CHAT SYNC
socket.on("receive-message", (msg: SessionMessage) => {
  setMessages((prev) => [...prev, msg]);
});

  };

  initSession();

  // ✅ CLEANUP (NOW NO ERROR)
  return () => {
    currentSocket?.off("receive-code");
    currentSocket?.off("receive-language");
    currentSocket?.off("receive-message");
    currentSocket?.off("user-joined");
    currentSocket?.off("offer");
    currentSocket?.off("answer");
    currentSocket?.off("ice-candidate");

    currentSocket?.disconnect();
    currentPeer?.close();

    if (currentStream) {
      currentStream.getTracks().forEach((t) => t.stop());
    }
  };
}, [sessionKey, role, router]);

  return (
    <div className="h-screen flex flex-col bg-black text-white font-sans overflow-hidden">
      
      {/* 🎥 VIDEO BAR */}
      <div className="h-1/3 flex border-b border-white/10 p-2 gap-2 bg-gray-900">
        <div className="w-1/2 relative rounded-xl overflow-hidden bg-black border border-white/5">
          <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
          <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-white/10">
            You ({role})
          </span>
        </div>
        <div className="w-1/2 relative rounded-xl overflow-hidden bg-black border border-white/5">
          <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
          <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-white/10">
            Peer
          </span>
        </div>
      </div>

      {/* 💻 MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Editor Side */}
        <div className="flex-1 flex flex-col">
          <div className="bg-[#1e1e1e] px-4 py-2 text-[11px] font-mono text-gray-500 border-b border-white/5 flex justify-between items-center">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              LIVE_COLLAB.ts
            </span>
            
            {/* Language Selector (Clears your warning) */}
            <select 
              value={language} 
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-gray-800 text-white text-[10px] px-2 py-1 rounded border border-white/10 outline-none"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="cpp">C++</option>
              <option value="typescript">TypeScript</option>
            </select>

            <span className="text-purple-400 font-bold">ID: {sessionKey}</span>
          </div>
          
          <div className="flex-1">
            <Editor
              theme="vs-dark"
              language={language}
              value={code}
              onChange={handleCodeChange}
              options={{
                fontSize: 15,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                lineNumbers: "on",
              }}
            />
          </div>
        </div>

        {/* Floating Controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 bg-black/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-2xl z-50">
          <button onClick={toggleMic} className={`p-3 rounded-xl transition-all ${isMicOn ? 'bg-white/10 hover:bg-white/20' : 'bg-red-500 text-white'}`}>
            {isMicOn ? "🎙️" : "🔇"}
          </button>
          
          <button onClick={toggleCam} className={`p-3 rounded-xl transition-all ${isCamOn ? 'bg-white/10 hover:bg-white/20' : 'bg-red-500 text-white'}`}>
            {isCamOn ? "📷" : "🚫"}
          </button>

          <button onClick={endCall} className="bg-red-600 hover:bg-red-500 p-3 rounded-xl px-6 font-bold text-xs uppercase tracking-widest transition-all">
            End Session
          </button>
        </div>

        {/* 💬 CHAT SIDEBAR */}
        <div className="w-80 flex flex-col bg-[#0f0f0f] border-l border-white/10">
          <div className="p-4 border-b border-white/10 text-xs font-black tracking-widest text-gray-400 uppercase">Chat</div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.senderRole === role ? "items-end" : "items-start"}`}>
                <div className="flex gap-2 items-center mb-1">
                   <span className="text-[9px] text-gray-600 font-bold uppercase">{m.senderRole}</span>
                   <span className="text-[8px] text-gray-500">{m.timestamp}</span>
                </div>
                <div className={`p-3 rounded-2xl text-sm max-w-[90%] shadow-lg ${
                  m.senderRole === role
                    ? "bg-purple-600 text-white rounded-tr-none"
                    : "bg-white/5 text-gray-300 rounded-tl-none border border-white/10"
                }`}>
                  {m.message}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-[#0f0f0f] border-t border-white/10">
            <div className="flex gap-2 bg-white/5 rounded-xl border border-white/10 p-1">
              <input
                className="flex-1 bg-transparent px-3 py-2 outline-none text-sm placeholder:text-gray-600"
                placeholder="Message..."
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              />
              <button
                onClick={sendChat}
                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold text-[10px]"
              >
                SEND
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}