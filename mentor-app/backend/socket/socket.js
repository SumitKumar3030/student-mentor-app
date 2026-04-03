/**
 * socket.js
 * This module handles all real-time events for the mentorship platform.
 * It uses 'sessionKey' to match the frontend state.
 */

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("User Connected:", socket.id);

    // 1. Join Room
    // Frontend sends: socket.emit("join-session", sessionKey)
    socket.on("join-session", (sessionKey) => {
      socket.join(sessionKey);
      console.log(`User ${socket.id} joined session: ${sessionKey}`);
    });

    // 2. Code Synchronization
    // Uses socket.to() so the sender doesn't receive their own update back
    socket.on("code-change", ({ sessionKey, code }) => {
      socket.to(sessionKey).emit("receive-code", code);
    });

    // 3. Language Sync (e.g., switching from JS to Python)
    socket.on("language-change", ({ sessionKey, language }) => {
      socket.to(sessionKey).emit("receive-language", language);
    });

    // 4. Chat Messaging
    // The data object must contain sessionKey, message, senderRole, and timestamp
    socket.on("send-message", (data) => {
      // socket.to ensures the person who sent the message doesn't get a duplicate
      if (data.sessionKey) {
        socket.to(data.sessionKey).emit("receive-message", data);
      }
    });

    // 5. WebRTC Signaling (Video/Audio)
    socket.on("offer", ({ sessionKey, offer }) => {
      socket.to(sessionKey).emit("offer", offer);
    });

    socket.on("answer", ({ sessionKey, answer }) => {
      socket.to(sessionKey).emit("answer", answer);
    });

    socket.on("ice-candidate", ({ sessionKey, candidate }) => {
      socket.to(sessionKey).emit("ice-candidate", candidate);
    });

    // 6. Cleanup
    socket.on("disconnect", () => {
      console.log("User Disconnected:", socket.id);
    });
  });
};