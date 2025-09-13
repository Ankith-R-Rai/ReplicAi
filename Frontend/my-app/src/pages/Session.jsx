import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ label, value, colorClass = 'text-white' }) => (
  <div className="bg-gray-800 rounded-lg p-4 text-center">
    <p className="text-sm text-gray-400 font-medium uppercase tracking-wider">{label}</p>
    <p className={`text-4xl font-bold mt-1 ${colorClass}`}>{value}</p>
  </div>
);

const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="text-green-500 text-6xl mb-4 h-16 w-16" fill="currentColor">
        <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47.1 47.1L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z" />
    </svg>
);

function Session({ authToken }) {
  const [repCounts, setRepCounts] = useState({ good: 0, bad: 0, uncertain: 0 });
  const [feedback, setFeedback] = useState('Select an exercise and press Start.');
  const [accuracy, setAccuracy] = useState(0);
  const [sessionState, setSessionState] = useState('idle'); // idle, analyzing, finished
  const [selectedExercise, setSelectedExercise] = useState('squat');
  const [startTime, setStartTime] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const navigate = useNavigate();
  
  const API_BASE_URL = 'http://127.0.0.1:5000/api';

  const stopAnalysis = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
  }, []);

  const handleSaveWorkout = async () => {
    const duration_seconds = startTime ? Math.floor((new Date() - startTime) / 1000) : 0;
    
    const workoutData = {
      exercise_type: selectedExercise,
      rep_count: repCounts.good,
      duration_seconds: duration_seconds,
      average_accuracy: accuracy,
    };

    try {
      if (!authToken) {
        console.error("Auth token not available.");
        alert('You must be logged in to save a workout!');
        return;
      }
        
      const response = await fetch(`${API_BASE_URL}/workout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workoutData),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      console.log('Workout saved successfully!');
      // Navigate to the progress page after saving
      navigate('/progress');
      
    } catch (error) {
      console.error('Failed to save workout:', error);
      alert('Failed to save workout. Please try again.');
    }
  };

  const handleStopSession = useCallback(() => {
    stopAnalysis();
    setSessionState('finished');
    setFeedback('Session complete! Great workout.');
  }, [stopAnalysis]);


  const sendFrameForAnalysis = useCallback(async () => {
    if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const imageSrc = canvas.toDataURL('image/jpeg');

      try {
        const response = await fetch(`${API_BASE_URL}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageSrc, exercise: selectedExercise }),
        });

        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        setRepCounts({ good: data.good_reps, bad: data.bad_reps, uncertain: data.uncertain_reps });
        setFeedback(data.feedback);
        setAccuracy(data.accuracy);
      } catch (error) {
        console.error("Error sending frame:", error);
        setFeedback('Error connecting to AI server.');
        handleStopSession();
      }
    }
  }, [selectedExercise, handleStopSession]);

  const startAnalysis = async () => {
    try {
      await fetch(`${API_BASE_URL}/reset`, { method: 'POST' });
      setRepCounts({ good: 0, bad: 0, uncertain: 0 });
      setAccuracy(0);
      setSessionState('analyzing');
      setFeedback('Analysis started!');
      setStartTime(new Date());

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;

      intervalRef.current = setInterval(sendFrameForAnalysis, 200);
    } catch (err) {
      console.error("Error accessing webcam: ", err);
      setFeedback("Please enable webcam access to start a session.");
    }
  };

  useEffect(() => {
    return () => stopAnalysis();
  }, [stopAnalysis]);

  return (
    <div>
      {sessionState === 'finished' ? (
        <div className="text-center flex flex-col items-center justify-center">
          <CheckCircleIcon />
          <h1 className="text-4xl font-bold mb-4">Workout Complete!</h1>
          <div className="bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full">
            <p className="text-lg text-gray-400 uppercase">{selectedExercise.replace(/_/g, ' ')}</p>
            <div className="grid grid-cols-3 gap-4 my-4">
              <div><p className="text-4xl font-bold text-green-500">{repCounts.good}</p><p className="text-sm text-gray-400">Good</p></div>
              <div><p className="text-4xl font-bold text-red-500">{repCounts.bad}</p><p className="text-sm text-gray-400">Bad</p></div>
              <div><p className="text-4xl font-bold text-yellow-500">{repCounts.uncertain}</p><p className="text-sm text-gray-400">Uncertain</p></div>
            </div>
            <p className="text-2xl text-gray-300">Final Accuracy: {accuracy}%</p>
          </div>
          {/* NEW: Save and Discard Buttons */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={handleSaveWorkout}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg text-lg"
            >
              Save & View Progress
            </button>
            <button
              onClick={() => navigate('/')}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg text-lg"
            >
              Discard
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
              <video ref={videoRef} autoPlay playsInline muted style={{ transform: 'scaleX(-1)' }} className="w-full h-full object-cover rounded-lg"/>
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="flex flex-col gap-6">
              <div className="bg-gray-800 rounded-lg p-4 flex flex-col items-center justify-center h-full">
                <p className="text-sm text-gray-400 font-medium uppercase tracking-wider mb-2">Form Accuracy</p>
                <div className="relative w-32 h-32 rounded-full flex items-center justify-center" style={{ background: `conic-gradient(#4f46e5 ${accuracy}%, #374151 0)` }}>
                  <div className="absolute w-28 h-28 bg-gray-800 rounded-full flex items-center justify-center"><span className="text-3xl font-bold">{accuracy}%</span></div>
                </div>
              </div>
              <StatCard label="Good Reps" value={repCounts.good} colorClass="text-green-500" />
              <StatCard label="Bad Reps" value={repCounts.bad} colorClass="text-red-500" />
              <StatCard label="Uncertain" value={repCounts.uncertain} colorClass="text-yellow-500" />
              <div className="bg-gray-800 rounded-lg p-6 text-center">
                <p className="text-sm text-gray-400 font-medium uppercase tracking-wider mb-2">Live Feedback</p>
                <p className="text-lg italic text-white h-12 flex items-center justify-center">{feedback}</p>
              </div>
              <div className="flex gap-4">
                <button onClick={startAnalysis} disabled={sessionState === 'analyzing'} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed">Start</button>
                <button onClick={handleStopSession} disabled={sessionState !== 'analyzing'} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed">Stop</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Session;
