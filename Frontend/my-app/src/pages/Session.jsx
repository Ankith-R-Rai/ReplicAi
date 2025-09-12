import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import Card from '../components/Card';
import { useNavigate } from 'react-router-dom';

function Session() {
  const [reps, setReps] = useState(0);
  const [feedback, setFeedback] = useState('Stand by to start analysis...');
  const [accuracy, setAccuracy] = useState(0);
  const [sessionState, setSessionState] = useState('idle'); 

  const webcamRef = useRef(null);
  const intervalRef = useRef(null);
  const navigate = useNavigate();

  // --- API Communication Logic (Placed correctly inside the component) ---
  const sendFrameForAnalysis = useCallback(async () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) return;

      try {
        const response = await fetch('http://127.0.0.1:5000/api/squat_analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageSrc }),
        });

        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();
        
        setReps(data.reps);
        setFeedback(data.feedback);
        // Using the angle from your API for accuracy
        const calculatedAccuracy = Math.min(100, Math.round((data.angle / 90) * 100));
        setAccuracy(calculatedAccuracy > 0 ? calculatedAccuracy : 0);

      } catch (error) {
        console.error("Error sending frame:", error);
        setFeedback('Error connecting to AI server.');
        stopAnalysis(); // Stop the session if the server connection fails
      }
    }
  }, []); // Empty dependency array means this function is created once

  // --- Session Control Logic ---
  const startAnalysis = () => {
    setSessionState('analyzing');
    setFeedback('Analysis started!');
    intervalRef.current = setInterval(sendFrameForAnalysis, 200);
  };

  const stopAnalysis = () => {
    setSessionState('finished');
    setFeedback('Session complete! Great workout.');
    if (intervalRef.current) {
        clearInterval(intervalRef.current);
    }
    intervalRef.current = null;
  };
  
  // Clean up the interval when the component unmounts (e.g., user navigates away)
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // --- Main Render Logic ---
  return (
    <div>
      {/* Show summary screen when finished */}
      {sessionState === 'finished' ? (
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Workout Complete!</h1>
          <Card title="Session Summary">
            <p className="text-lg">You completed</p>
            <p className="text-6xl font-bold my-4">{reps}</p>
            <p className="text-lg">reps with a final accuracy of <span className="text-green-400">{accuracy}%</span>.</p>
          </Card>
          <button 
            onClick={() => navigate('/')} 
            className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      ) : (
        // Show analysis screen when idle or analyzing
        <div>
          <h1 className="text-3xl font-semibold mb-6">Live Analysis Session</h1>
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-2/3">
              <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
                <Webcam
                  ref={webcamRef}
                  mirrored={true}
                  className="w-full h-full object-cover"
                  screenshotFormat="image/jpeg"
                />
              </div>
            </div>
            <div className="w-full lg:w-1/3 flex flex-col gap-6">
              <Card title="Workout Data">
                 <div className="flex justify-between items-center mb-4">
                  <span className="text-lg text-gray-400">Reps</span>
                  <span className="text-3xl font-bold">{reps}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lg text-gray-400">Accuracy (Depth)</span>
                  <span className="text-3xl font-bold text-green-400">{accuracy}%</span>
                </div>
              </Card>
              <Card title="Live Feedback">
                <p className="text-lg italic">{feedback}</p>
              </Card>
              <div className="flex gap-4">
                <button onClick={startAnalysis} disabled={sessionState === 'analyzing'} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500">
                  Start
                </button>
                <button onClick={stopAnalysis} disabled={sessionState !== 'analyzing'} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500">
                  Stop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Session;