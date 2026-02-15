import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import Session from "./models/Session.js";
import User from "./models/User.js";
import ServerRiskEngine from "./services/riskEngine.js";

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);

// Initialize risk engine
const riskEngine = new ServerRiskEngine();

// Session event storage
const sessionEvents = new Map();
const candidateSockets = new Map();
const activeSessions = new Map();
const sessionStartTimes = new Map();

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("startExam", async (data) => {
    try {
      const user = await User.findById(data.userId);
      if (!user) {
        console.error("User not found:", data.userId);
        return;
      }

      const session = await Session.create({
        candidateId: data.userId,
        candidateName: user.name,
        candidateEmail: user.email,
        startTime: new Date(),
        status: "active"
      });

      candidateSockets.set(data.userId, socket.id);
      activeSessions.set(data.userId, session._id);
      sessionStartTimes.set(data.userId, Date.now());
      sessionEvents.set(data.userId, []);

      socket.emit("examStarted", { sessionId: session._id });
      console.log("✅ Exam started for:", user.name);
    } catch (error) {
      console.error("Error starting exam:", error);
    }
  });

  // NEW: Receive raw events, calculate risk server-side
  socket.on("behavioralEvent", async (data) => {
    const userId = data.userId;
    
    // Store events for this session
    if (!sessionEvents.has(userId)) {
      sessionEvents.set(userId, []);
    }
    
    const events = sessionEvents.get(userId);
    events.push(data.event);
    
    // Keep only last 500 events to prevent memory issues
    if (events.length > 500) {
      events.shift();
    }
    
    console.log(`📊 Event received from ${data.name}: ${data.event.type}`);
  });

  // Calculate risk server-side every 4 seconds
  socket.on("requestRiskCalculation", async (data) => {
    const userId = data.userId;
    const events = sessionEvents.get(userId) || [];
    
    // SERVER-SIDE RISK CALCULATION
    const riskAnalysis = riskEngine.calculateRisk(userId, events);
    
    console.log(`🔐 Server calculated risk for ${data.name}: ${riskAnalysis.risk}`);
    
    // Send to candidate
    socket.emit("riskCalculated", riskAnalysis);
    
    // Broadcast to admins
    io.emit("adminRiskUpdate", {
      id: userId,
      name: data.name,
      ...riskAnalysis
    });
    
    // Save to database
    try {
      const sessionId = activeSessions.get(userId);
      if (sessionId) {
        await Session.findByIdAndUpdate(sessionId, {
          finalRiskScore: riskAnalysis.risk,
          $push: {
            riskHistory: {
              timestamp: new Date(),
              score: riskAnalysis.risk,
              confidence: riskAnalysis.confidence
            }
          },
          "behavioralData.tabSwitches": riskAnalysis.breakdown.tabSwitches,
          "behavioralData.pasteEvents": riskAnalysis.breakdown.pasteEvents,
          "behavioralData.mouseEntropy": riskAnalysis.breakdown.mouseEntropy,
          "behavioralData.mlAnomalyDetected": riskAnalysis.mlAnomaly,
          "behavioralData.anomalyScore": riskAnalysis.anomalyScore
        });
      }
    } catch (error) {
      console.error("Error saving risk data:", error);
    }
  });

  socket.on("terminateCandidate", async (data) => {
    const candidateSocketId = candidateSockets.get(data.candidateId);
    if (candidateSocketId) {
      io.to(candidateSocketId).emit("examTerminated", {
        message: "Your exam has been terminated by the administrator."
      });

      const sessionId = activeSessions.get(data.candidateId);
      const startTime = sessionStartTimes.get(data.candidateId) || Date.now();
      const finalDuration = Math.floor((Date.now() - startTime) / 1000);

      if (sessionId) {
        await Session.findByIdAndUpdate(sessionId, {
          status: "terminated",
          endTime: new Date(),
          duration: finalDuration,
          terminationReason: "Manually terminated by admin"
        });
      }

      candidateSockets.delete(data.candidateId);
      activeSessions.delete(data.candidateId);
      sessionStartTimes.delete(data.candidateId);
      sessionEvents.delete(data.candidateId);
      
      io.emit("candidateTerminated", { candidateId: data.candidateId });
    }
  });

  socket.on("warnCandidate", (data) => {
    const candidateSocketId = candidateSockets.get(data.candidateId);
    if (candidateSocketId) {
      io.to(candidateSocketId).emit("warning", {
        message: data.message || "Warning: Suspicious behavior detected!"
      });
    }
  });

  socket.on("submitExam", async (data) => {
    const sessionId = activeSessions.get(data.userId);
    const startTime = sessionStartTimes.get(data.userId) || Date.now();
    const finalDuration = Math.floor((Date.now() - startTime) / 1000);

    if (sessionId) {
      await Session.findByIdAndUpdate(sessionId, {
        status: "completed",
        endTime: new Date(),
        duration: finalDuration,
        questionsAttempted: data.answeredCount || 0,
        answers: data.answers || {}
      });
    }

    candidateSockets.delete(data.userId);
    activeSessions.delete(data.userId);
    sessionStartTimes.delete(data.userId);
    sessionEvents.delete(data.userId);
  });

  socket.on("disconnect", () => {
    for (const [id, socketId] of candidateSockets.entries()) {
      if (socketId === socket.id) {
        candidateSockets.delete(id);
        break;
      }
    }
    console.log("Client disconnected:", socket.id);
  });
});

app.get("/api/sessions", async (req, res) => {
  try {
    const sessions = await Session.find()
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching sessions", error });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔐 Server-side risk calculation ENABLED`);
});
