const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// 🔥 Track users per room (prevents duplicate joins)
const activeUsers = new Map();

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  // ✅ JOIN SESSION (FIXED)
  socket.on("join-session", (sessionKey) => {
    if (!sessionKey) return;

    // Prevent duplicate join from same socket
    if (activeUsers.get(socket.id) === sessionKey) return;

    activeUsers.set(socket.id, sessionKey);
    socket.join(sessionKey);

    console.log(`User ${socket.id} joined room: ${sessionKey}`);

    // Notify others
    socket.to(sessionKey).emit("user-joined");
  });

  // ✅ CODE SYNC
  socket.on("code-change", ({ sessionKey, code }) => {
    socket.to(sessionKey).emit("receive-code", code);
  });

  // ✅ LANGUAGE SYNC
  socket.on("language-change", ({ sessionKey, language }) => {
    socket.to(sessionKey).emit("receive-language", language);
  });

  // ✅ CHAT (NO DUPLICATES)
  socket.on("send-message", (data) => {
    if (!data.sessionKey) return;

    socket.to(data.sessionKey).emit("receive-message", data);
  });

  // ✅ WEBRTC SIGNALING
  socket.on("offer", ({ sessionKey, offer }) => {
    socket.to(sessionKey).emit("offer", offer);
  });

  socket.on("answer", ({ sessionKey, answer }) => {
    socket.to(sessionKey).emit("answer", answer);
  });

  socket.on("ice-candidate", ({ sessionKey, candidate }) => {
    socket.to(sessionKey).emit("ice-candidate", candidate);
  });

  // ✅ CLEANUP
  socket.on("disconnect", () => {
    console.log("User Disconnected:", socket.id);

    // Remove from active users
    activeUsers.delete(socket.id);
  });
});

// ✅ HEALTH CHECK
app.get("/", (req, res) => {
  res.send("✅ Backend is live and Sockets are ready!");
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Backend Server running on port ${PORT}`);
});
