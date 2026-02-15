import { useState, useCallback, useEffect, useRef } from "react";
import Navbar from "../components/shared/Navbar";
import { MOCK_QUESTIONS } from "../utils/constants";
import useMouseTracking from "../hooks/useMouseTracking";
import useTabSwitch from "../hooks/useTabSwitch";
import useCopyPaste from "../hooks/useCopyPaste";
import useAuthStore from "../stores/useAuthStore";
import socket from "../services/socket";

export default function CandidateExam() {
  const user = useAuthStore((s) => s.user);

  const [events, setEvents] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(120);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [warning, setWarning] = useState(null);
  const [warningLevel, setWarningLevel] = useState(0);
  const [terminated, setTerminated] = useState(false);
  const [currentRisk, setCurrentRisk] = useState(0);
  const [currentBreakdown, setCurrentBreakdown] = useState({});
  const [examStarted, setExamStarted] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(false);

  const warningShownRef = useRef({ first: false, second: false });

  // Start exam session
  useEffect(() => {
    if (user && !examStarted) {
      const userId = user.id || user._id;
      console.log("🚀 Starting exam for user:", userId);
      socket.emit("startExam", { userId });
      setExamStarted(true);
    }
  }, [user, examStarted]);

  // Event handler - sends to server immediately
  const handleEvent = useCallback((event) => {
    if (submitted) return;
    
    // Store locally for display
    setEvents((prev) => [...prev, event]);
    
    // Send to server for risk calculation
    const userId = user?.id || user?._id;
    socket.emit("behavioralEvent", {
      userId,
      name: user?.name,
      event: event
    });
    
    console.log(`📤 Sent ${event.type} event to server`);
  }, [submitted, user]);

  useMouseTracking(handleEvent);
  useTabSwitch(handleEvent);
  useCopyPaste(handleEvent);

  // Socket listeners
  useEffect(() => {
    socket.on("examTerminated", (data) => {
      console.log("❌ Exam terminated by admin");
      setTerminated(true);
      setSubmitted(true);
    });

    socket.on("warning", (data) => {
      console.log("⚠️ Warning received:", data.message);
      setWarning(data.message);
      setTimeout(() => setWarning(null), 10000);
    });

    // Receive server-calculated risk
    socket.on("riskCalculated", (data) => {
      console.log("📊 Risk received from server:", data.risk);
      setCurrentRisk(data.risk);
      setCurrentBreakdown(data.breakdown || {});
      
      // Handle auto warnings based on server risk
      if (!warningShownRef.current.first && data.risk >= 60 && data.risk < 75) {
        warningShownRef.current.first = true;
        setWarningLevel(1);
        setWarning("FIRST WARNING: Suspicious behavior detected.");
        setTimeout(() => setWarning(null), 15000);
      }
      
      if (!warningShownRef.current.second && data.risk >= 75 && data.risk < 85) {
        warningShownRef.current.second = true;
        setWarningLevel(2);
        setWarning("FINAL WARNING: Your exam will be terminated if behavior continues.");
        setTimeout(() => setWarning(null), 20000);
      }
      
      if (data.risk >= 85 && !submitted) {
        setTerminated(true);
        setSubmitted(true);
        setWarning("EXAM TERMINATED: Risk threshold exceeded.");
      }
    });

    return () => {
      socket.off("examTerminated");
      socket.off("warning");
      socket.off("riskCalculated");
    };
  }, [submitted]);

  // Calibration
  useEffect(() => {
    if (isCalibrated) return;

    const progressInterval = setInterval(() => {
      setCalibrationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 1000);

    const timer = setTimeout(() => {
      setIsCalibrated(true);
      console.log("✅ Calibration complete");
    }, 10000);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [isCalibrated]);

  // Request server risk calculation every 4 seconds
  useEffect(() => {
    if (!isCalibrated || submitted) return;
    
    const interval = setInterval(() => {
      const userId = user?.id || user?._id;
      socket.emit("requestRiskCalculation", {
        userId,
        name: user?.name
      });
      console.log("🔄 Requesting risk calculation from server");
    }, 4000);
    
    return () => clearInterval(interval);
  }, [isCalibrated, submitted, user]);

  // Timer
  useEffect(() => {
    if (submitted || !isCalibrated) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [submitted, isCalibrated]);

  const handleSubmit = () => {
    setSubmitted(true);
    const userId = user?.id || user?._id;
    const answeredCount = Object.keys(answers).length;
    
    socket.emit("submitExam", {
      userId,
      answers,
      answeredCount,
      timeSpent: 120 - timeLeft
    });
    
    console.log("✅ Exam submitted");
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleTextChange = (questionId, text) => {
    setAnswers(prev => ({ ...prev, [questionId]: text }));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((currentQuestion + 1) / MOCK_QUESTIONS.length) * 100;
  const answeredCount = Object.keys(answers).length;

  // Submitted view
  if (submitted) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl w-full">
            <div className="text-center mb-8">
              <div className={`w-24 h-24 ${terminated ? 'bg-red-100 border-red-500' : 'bg-green-100 border-green-500'} rounded-full flex items-center justify-center mx-auto mb-6 border-4`}>
                {terminated ? (
                  <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <h1 className={`text-4xl font-bold mb-3 ${terminated ? 'text-red-800' : 'text-gray-800'}`}>
                {terminated ? 'Examination Terminated' : 'Examination Submitted Successfully'}
              </h1>
            </div>

            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 mb-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-600">Questions</p>
                  <p className="text-2xl font-bold text-indigo-600">{answeredCount}/{MOCK_QUESTIONS.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Time</p>
                  <p className="text-2xl font-bold text-purple-600">{formatTime(120 - timeLeft)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Final Risk</p>
                  <p className={`text-2xl font-bold ${currentRisk > 50 ? 'text-red-600' : 'text-green-600'}`}>{currentRisk}</p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button onClick={() => window.location.href = '/'} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-10 py-3 rounded-lg font-semibold shadow-lg">
                Return to Login
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const currentQ = MOCK_QUESTIONS[currentQuestion];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">

        {/* Warning Banner */}
        {warning && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-3xl px-4">
            <div className={`${
              warningLevel === 2 ? 'bg-gradient-to-r from-red-600 to-red-700' : 
              warningLevel === 1 ? 'bg-gradient-to-r from-orange-600 to-orange-700' :
              'bg-gradient-to-r from-yellow-500 to-yellow-600'
            } text-white rounded-xl shadow-2xl p-6`}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-xl mb-1">
                    {warningLevel === 2 ? 'FINAL WARNING' : 'FIRST WARNING'}
                  </h3>
                  <p>{warning}</p>
                  <p className="text-sm mt-2 opacity-80">Server Risk Score: {currentRisk}/100</p>
                </div>
                <button onClick={() => setWarning(null)} className="text-white opacity-80 hover:opacity-100">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Behavior Monitor (Server-Calculated) */}
        <div className="fixed bottom-4 right-4 z-40">
          <div className={`rounded-xl shadow-lg p-4 border-2 min-w-[220px] ${
            currentRisk >= 75 ? 'bg-red-50 border-red-500' :
            currentRisk >= 50 ? 'bg-orange-50 border-orange-500' :
            currentRisk >= 25 ? 'bg-yellow-50 border-yellow-500' :
            'bg-green-50 border-green-500'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-gray-700 uppercase">🔐 Server Risk Monitor</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                isCalibrated ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'
              }`}>
                {isCalibrated ? 'ACTIVE' : 'CALIBRATING'}
              </span>
            </div>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    currentRisk >= 75 ? 'bg-red-600' :
                    currentRisk >= 50 ? 'bg-orange-600' :
                    currentRisk >= 25 ? 'bg-yellow-600' : 'bg-green-600'
                  }`} 
                  style={{ width: `${currentRisk}%` }} 
                />
              </div>
              <span className={`text-2xl font-bold ${
                currentRisk >= 75 ? 'text-red-700' :
                currentRisk >= 50 ? 'text-orange-700' :
                currentRisk >= 25 ? 'text-yellow-700' : 'text-green-700'
              }`}>{currentRisk}</span>
            </div>

            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Events Tracked:</span>
                <span className="font-semibold">{events.length}</span>
              </div>
              {currentBreakdown && (
                <>
                  <div className="flex justify-between">
                    <span>Tab Switches:</span>
                    <span className="font-semibold text-blue-600">{currentBreakdown.tabSwitches || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paste Events:</span>
                    <span className="font-semibold text-purple-600">{currentBreakdown.pasteEvents || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mouse Entropy:</span>
                    <span className="font-semibold text-pink-600">{currentBreakdown.mouseEntropy || 0}</span>
                  </div>
                </>
              )}
              <div className="pt-1 border-t text-center">
                <span className="text-xs font-semibold text-indigo-600">
                  Risk calculated server-side
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white shadow-lg sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Online Assessment</h1>
                <p className="text-sm text-gray-500">
                  {isCalibrated ? '✅ Server-side monitoring active' : '⏳ Calibrating behavior baseline...'}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Progress</p>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-sm font-semibold">{answeredCount}/{MOCK_QUESTIONS.length}</span>
                  </div>
                </div>
                <div className={`text-center px-4 py-2 rounded-lg ${timeLeft < 30 ? 'bg-red-50' : 'bg-indigo-50'}`}>
                  <p className={`text-xs mb-1 ${timeLeft < 30 ? 'text-red-600' : 'text-indigo-600'}`}>Time</p>
                  <p className={`text-2xl font-bold font-mono ${timeLeft < 30 ? 'text-red-700 animate-pulse' : 'text-indigo-700'}`}>
                    {formatTime(timeLeft)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Calibration Banner */}
        {!isCalibrated && (
          <div className="max-w-7xl mx-auto px-8 mt-6">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-xl shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="animate-spin">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold">Behavioral Calibration in Progress</p>
                    <p className="text-sm text-blue-100">Learning your unique behavior patterns</p>
                  </div>
                </div>
                <span className="text-2xl font-bold">{Math.round(calibrationProgress)}%</span>
              </div>
              <div className="w-full h-2 bg-blue-400 rounded-full overflow-hidden">
                <div className="h-full bg-white transition-all" style={{ width: `${calibrationProgress}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="grid grid-cols-12 gap-6">
            
            {/* Question Palette */}
            <div className="col-span-3">
              <div className="bg-white rounded-xl shadow-lg p-4 sticky top-24">
                <h3 className="font-bold text-gray-800 mb-4">Question Palette</h3>
                <div className="grid grid-cols-3 gap-2">
                  {MOCK_QUESTIONS.map((q, index) => (
                    <button 
                      key={q.id} 
                      onClick={() => setCurrentQuestion(index)} 
                      className={`w-full aspect-square rounded-lg font-semibold text-sm transition-all ${
                        currentQuestion === index 
                          ? 'bg-indigo-600 text-white shadow-lg scale-110' 
                          : answers[q.id] !== undefined 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Question Content */}
            <div className="col-span-9">
              <div className="bg-white rounded-xl shadow-xl p-8">
                <div className="mb-6 pb-4 border-b">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                      Question {currentQuestion + 1} of {MOCK_QUESTIONS.length}
                    </span>
                    <span className={`text-xs px-3 py-1 rounded-full ${
                      answers[currentQ.id] !== undefined ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {answers[currentQ.id] !== undefined ? '✓ Answered' : 'Not Answered'}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">{currentQ.question}</h2>
                </div>

                {currentQ.type === "mcq" ? (
                  <div className="space-y-3">
                    {currentQ.options.map((opt, i) => (
                      <label 
                        key={i} 
                        className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          answers[currentQ.id] === i 
                            ? 'border-indigo-600 bg-indigo-50' 
                            : 'border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name={`q-${currentQ.id}`} 
                          checked={answers[currentQ.id] === i} 
                          onChange={() => handleAnswerChange(currentQ.id, i)} 
                          className="mt-1 w-5 h-5 text-indigo-600" 
                        />
                        <span className={`flex-1 text-lg ${
                          answers[currentQ.id] === i ? 'font-semibold text-indigo-900' : 'text-gray-700'
                        }`}>{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div>
                    <textarea 
                      value={answers[currentQ.id] || ''} 
                      onChange={(e) => handleTextChange(currentQ.id, e.target.value)} 
                      placeholder={currentQ.placeholder} 
                      className="w-full h-48 p-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 resize-none text-lg" 
                    />
                    <p className="text-sm text-gray-500 mt-2">Characters: {(answers[currentQ.id] || '').length}</p>
                  </div>
                )}

                <div className="flex justify-between items-center mt-8 pt-6 border-t">
                  <button 
                    onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))} 
                    disabled={currentQuestion === 0} 
                    className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <div className="flex gap-3">
                    {currentQuestion < MOCK_QUESTIONS.length - 1 ? (
                      <button 
                        onClick={() => setCurrentQuestion(prev => prev + 1)} 
                        className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg"
                      >
                        Next
                      </button>
                    ) : (
                      <button 
                        onClick={handleSubmit} 
                        className="flex items-center gap-2 px-8 py-3 rounded-lg font-semibold bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg"
                      >
                        Submit Exam
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
