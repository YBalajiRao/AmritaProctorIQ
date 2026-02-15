import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  candidateName: String,
  candidateEmail: String,
  
  examId: {
    type: String,
    default: "default-exam"
  },
  
  startTime: {
    type: Date,
    default: Date.now
  },
  
  endTime: Date,
  
  duration: Number, // in seconds
  
  finalRiskScore: {
    type: Number,
    default: 0
  },
  
  averageRiskScore: Number,
  
  maxRiskScore: Number,
  
  status: {
    type: String,
    enum: ["active", "completed", "terminated"],
    default: "active"
  },
  
  terminationReason: String,
  
  warningsIssued: {
    type: Number,
    default: 0
  },
  
  behavioralData: {
    tabSwitches: { type: Number, default: 0 },
    pasteEvents: { type: Number, default: 0 },
    mouseEntropy: { type: Number, default: 0 },
    mlAnomalyDetected: { type: Boolean, default: false },
    anomalyScore: { type: Number, default: 0 }
  },
  
  questionsAttempted: {
    type: Number,
    default: 0
  },
  
  totalQuestions: {
    type: Number,
    default: 8
  },
  
  answers: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  
  riskHistory: [{
    timestamp: Date,
    score: Number,
    confidence: Number
  }],
  
  events: [{
    type: String,
    timestamp: Date,
    data: mongoose.Schema.Types.Mixed
  }]
  
}, { timestamps: true });

export default mongoose.model("Session", sessionSchema);
