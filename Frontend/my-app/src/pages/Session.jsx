import React, { useState, useRef, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import { useAuth0 } from "@auth0/auth0-react";
import { FaCheckCircle } from "react-icons/fa";
import Confetti from 'react-confetti';

// --- Configuration ---
const API_URL = "http://localhost:5000";

// --- UI Components ---
const StatCard = ({ label, value }) => (
  <div className="bg-gray-800 rounded-lg p-4 text-center">
    <p className="text-sm text-gray-400 font-medium uppercase tracking-wider">{label}</p>
    <p className="text-4xl font-bold mt-1">{value}</p>
  </div>
);

function Session() {
  const { getAccessTokenSilently, isAuthenticated, loginWithRedirect } = useAuth0();

  // --- State Management ---
  const [repCount, setRepCount] = useState(0);
  const [status, setStatus] = useState("UP");
  const [feedback, setFeedback] = useState("Set a rep target and press Start.");
  const [accuracy, setAccuracy] = useState(0);
  const [sessionState, setSessionState] = useState("idle");
  const [selectedExercise, setSelectedExercise] = useState("squat");
  const [targetReps, setTargetReps] = useState(10);
  const [sessionResult, setSessionResult] = useState(null);
  const [accuracyHistory, setAccuracyHistory] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [isWorkoutSaved, setIsWorkoutSaved] = useState(false);
  const [personalBest, setPersonalBest] = useState(null);
  const [isNewRecord, setIsNewRecord] = useState(false);

  // --- Refs ---
  const webcamRef = useRef(null);
  const intervalRef = useRef(null);
  
  // Fetch personal bests when the component loads
  useEffect(() => {
    const fetchBests = async () => {
        if (!isAuthenticated) return;
        try {
            const token = await getAccessTokenSilently();
            const response = await fetch(`${API_URL}/api/personal_bests`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            setPersonalBest(data);
        } catch (error) {
            console.error("Could not fetch personal bests:", error);
        }
    };
    fetchBests();
  }, [isAuthenticated, getAccessTokenSilently]);

  const stopAnalysis = useCallback((finalReps) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const totalAccuracy = accuracyHistory.reduce((sum, acc) => sum + acc, 0);
    const averageAccuracy = accuracyHistory.length > 0 ? Math.round(totalAccuracy / accuracyHistory.length) : 0;
    const duration = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
    const finalRepCount = finalReps !== undefined ? finalReps : repCount;
    
    const currentBest = personalBest ? (personalBest[selectedExercise] || 0) : 0;
    if (finalRepCount > currentBest) {
        setIsNewRecord(true);
    }

    setSessionResult({
      totalReps: finalRepCount,
      averageAccuracy: averageAccuracy,
      duration: duration,
    });

    setSessionState("finished");
  }, [accuracyHistory, repCount, startTime, personalBest, selectedExercise]);
  
  const sendFrameForAnalysis = useCallback(async () => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;
    try {
      const token = await getAccessTokenSilently();
      const response = await fetch(`${API_URL}/api/process_frame`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ image_data: imageSrc, exercise: selectedExercise }),
      });
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      setRepCount(data.count || 0);
      setStatus(data.stage);
      setFeedback(data.feedback || "Stand by...");
      const calculatedAccuracy = Math.min(100, Math.round(((data.angle || 0) / 120) * 100));
      const validAccuracy = calculatedAccuracy >= 0 ? calculatedAccuracy : 0;
      setAccuracy(validAccuracy);
      if (validAccuracy > 0) setAccuracyHistory(prev => [...prev, validAccuracy]);
      if (targetReps > 0 && data.count >= targetReps) stopAnalysis(data.count);
    } catch (error) {
      console.error("Error sending frame:", error);
      setFeedback("⚠️ Connection issue, retrying...");
    }
  }, [getAccessTokenSilently, selectedExercise, targetReps, stopAnalysis]);

  const startAnalysis = () => {
    if (!isAuthenticated) {
      loginWithRedirect({ appState: { returnTo: "/session" } });
      return;
    }
    
    setSessionResult(null);
    setAccuracyHistory([]);
    setRepCount(0);
    setStatus("UP");
    setAccuracy(0);
    setSessionState("analyzing");
    setFeedback("Analysis started!");
    setStartTime(Date.now());
    setIsWorkoutSaved(false);
    setIsNewRecord(false);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(sendFrameForAnalysis, 500);
  };
  
  const handleSaveWorkout = async () => {
    if (!sessionResult || isWorkoutSaved) return;
    try {
        const token = await getAccessTokenSilently();
        await fetch(`${API_URL}/api/save_workout`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                exercise_type: selectedExercise,
                rep_count: sessionResult.totalReps,
                duration_seconds: sessionResult.duration,
                average_accuracy: sessionResult.averageAccuracy,
            }),
        });
        setIsWorkoutSaved(true);
        alert("Workout saved to your history!");
    } catch (error) {
        console.error("Error saving workout:", error);
        alert("Failed to save workout.");
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div>
      {sessionResult ? (
        <div className="text-center flex flex-col items-center justify-center min-h-[80vh]">
          {isNewRecord && <Confetti />}
          <FaCheckCircle className="text-green-500 text-6xl mb-4" />
          <h1 className="text-4xl font-bold mb-4">
            {isNewRecord ? "New Personal Best!" : "Workout Complete!"}
          </h1>
          <div className="bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full">
            <p className="text-lg text-gray-400 uppercase">{selectedExercise.replace("_", " ")}</p>
            <div className="flex justify-around items-center mt-4">
              <div className="text-center">
                <p className="text-7xl font-bold text-white">{sessionResult.totalReps}</p>
                <p className="text-xl text-gray-300">Total Reps</p>
              </div>
              <div className="text-center">
                <p className="text-7xl font-bold text-white">{sessionResult.averageAccuracy}%</p>
                <p className="text-xl text-gray-300">Avg. Accuracy</p>
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-8">
            <button
                onClick={handleSaveWorkout}
                disabled={isWorkoutSaved}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg text-lg disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
                {isWorkoutSaved ? "Saved!" : "Save to History"}
            </button>
            <button
              onClick={startAnalysis}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg text-lg"
            >
              Go Again
            </button>
          </div>
        </div>
      ) : (
        <div>
         <div className="flex flex-col md:flex-row justify-between items-center mb-6">
           <h1 className="text-3xl font-semibold">Live Analysis Session</h1>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <label htmlFor="exercise" className="font-medium">Exercise:</label>
             <select
                id="exercise"
                value={selectedExercise}
                onChange={(e) => setSelectedExercise(e.target.value)}
                disabled={sessionState === "analyzing"}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
              >
                <option value="squat">Squat</option>
                <option value="pushup">Pushup</option>
                <option value="bicep_curl">Bicep Curl</option>
                <option value="lunge">Lunge</option>
                <option value="jumping_jack">Jumping Jack</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-black rounded-lg flex items-center justify-center min-h-[70vh] shadow-lg">
              <Webcam ref={webcamRef} mirrored className="w-full h-full object-cover rounded-lg" screenshotFormat="image/jpeg" />
            </div>
            <div className="flex flex-col gap-6">
              <div className="bg-gray-800 rounded-lg p-4 flex flex-col items-center justify-center h-full">
                <p className="text-sm text-gray-400 font-medium uppercase tracking-wider mb-2">Form Accuracy</p>
                <div
                  className="relative w-32 h-32 rounded-full flex items-center justify-center"
                  style={{ background: `conic-gradient(#4f46e5 ${accuracy}%, #374151 0)` }}
                >
                  <div className="absolute w-28 h-28 bg-gray-800 rounded-full flex items-center justify-center">
                    <span className="text-3xl font-bold">{accuracy}%</span>
                  </div>
                </div>
              </div>
              <StatCard label="Rep Counter" value={repCount} />
              <div className="bg-gray-800 rounded-lg p-4 text-center">
                <label htmlFor="reps-input" className="text-sm text-gray-400 font-medium uppercase tracking-wider">Target Reps</label>
                <input
                  id="reps-input"
                  type="number"
                  value={targetReps}
                  onChange={(e) => setTargetReps(Number(e.target.value))}
                  disabled={sessionState === "analyzing"}
                  min="1"
                  className="mt-1 w-full bg-gray-700 text-white text-center p-2 text-2xl font-bold rounded-lg border-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="bg-gray-800 rounded-lg p-6 text-center">
                <p className="text-sm text-gray-400 font-medium uppercase tracking-wider mb-2">Live Feedback</p>
                <p className="text-lg italic text-white h-12 flex items-center justify-center">{feedback}</p>
              </div>
              <div className="flex gap-4">
                <button onClick={startAnalysis} disabled={sessionState === "analyzing"} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed">Start</button>
                <button onClick={() => stopAnalysis()} disabled={sessionState !== "analyzing"} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed">Stop</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Session;