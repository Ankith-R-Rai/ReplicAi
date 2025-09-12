import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { useNavigate } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';

const StatCard = ({ label, value }) => (
  <div className="bg-gray-800 rounded-lg p-4 text-center">
    <p className="text-sm text-gray-400 font-medium uppercase tracking-wider">{label}</p>
    <p className="text-4xl font-bold mt-1">{value}</p>
  </div>
);

function Session() {
  const [reps, setReps] = useState(0);
  const [feedback, setFeedback] = useState('Select an exercise and press Start.');
  const [accuracy, setAccuracy] = useState(0);
  const [sessionState, setSessionState] = useState('idle');
  const [selectedExercise, setSelectedExercise] = useState('squat');

  const webcamRef = useRef(null);
  const intervalRef = useRef(null);
  const navigate = useNavigate();

  const sendFrameForAnalysis = useCallback(async () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) return;

      try {
        const response = await fetch('http://127.0.0.1:5000/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: imageSrc,
            exercise: selectedExercise
          }),
        });

        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();

        setReps(data.reps);
        setFeedback(data.feedback);
        const calculatedAccuracy = Math.min(100, Math.round((data.angle / 120) * 100));
        setAccuracy(calculatedAccuracy >= 0 ? calculatedAccuracy : 0);

      } catch (error) {
        console.error("Error sending frame:", error);
        setFeedback('Error connecting to AI server.');
        if (intervalRef.current) clearInterval(intervalRef.current);
        setSessionState('idle');
      }
    }
  }, [selectedExercise]);

  const stopAnalysis = useCallback(() => {
    setSessionState('finished');
    setFeedback('Session complete! Great workout.');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = null;
  }, []);

  const startAnalysis = async () => {
    // Reset the backend tracker before starting
    await fetch('http://127.0.0.1:5000/api/reset', { method: 'POST' });
    
    setReps(0);
    setAccuracy(0);
    setSessionState('analyzing');
    setFeedback('Analysis started!');
    intervalRef.current = setInterval(sendFrameForAnalysis, 200);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div>
      {sessionState === 'finished' ? (
        <div className="text-center flex flex-col items-center justify-center">
          <FaCheckCircle className="text-green-500 text-6xl mb-4" />
          <h1 className="text-4xl font-bold mb-4">Workout Complete!</h1>
          <div className="bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full">
            <p className="text-lg text-gray-400 uppercase">{selectedExercise.replace('_', ' ')}</p>
            <p className="text-7xl font-bold my-4 text-white">{reps}</p>
            <p className="text-2xl text-gray-300">Total Reps</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg text-lg"
          >
            Back to Dashboard
          </button>
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
                disabled={sessionState === 'analyzing'}
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
              <Webcam
                ref={webcamRef}
                mirrored={true}
                className="w-full h-full object-cover rounded-lg"
                screenshotFormat="image/jpeg"
              />
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
              <StatCard label="Rep Counter" value={reps} />
              <div className="bg-gray-800 rounded-lg p-6 text-center">
                <p className="text-sm text-gray-400 font-medium uppercase tracking-wider mb-2">Live Feedback</p>
                <p className="text-lg italic text-white h-12 flex items-center justify-center">{feedback}</p>
              </div>
              <div className="flex gap-4">
                <button onClick={startAnalysis} disabled={sessionState === 'analyzing'} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed">
                  Start
                </button>
                <button onClick={stopAnalysis} disabled={sessionState !== 'analyzing'} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed">
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