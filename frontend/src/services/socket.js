import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("❌ Socket disconnected:", reason);
});

socket.on("connect_error", (error) => {
  console.error("🔴 Connection error:", error.message);
});

socket.on("reconnect", (attemptNumber) => {
  console.log("🔄 Reconnected after", attemptNumber, "attempts");
});

// Debug: Log all emitted events
const originalEmit = socket.emit.bind(socket);
socket.emit = function(event, ...args) {
  console.log("📤 EMIT:", event, args[0] ? JSON.stringify(args[0]).substring(0, 100) : "");
  return originalEmit(event, ...args);
};

// Debug: Log all received events
socket.onAny((eventName, ...args) => {
  console.log("📥 RECV:", eventName, args[0] ? JSON.stringify(args[0]).substring(0, 100) : "");
});

export default socket;
