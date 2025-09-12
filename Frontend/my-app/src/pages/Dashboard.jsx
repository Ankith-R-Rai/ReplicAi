import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import Card from '../components/Card';
import { VscHistory } from 'react-icons/vsc';
import { GoGoal } from 'react-icons/go';
import { LuSquarePlay } from 'react-icons/lu';
import { FaDumbbell, FaChartLine, FaUsers } from 'react-icons/fa';

function Dashboard() {
  const location = useLocation();

  // This effect runs when the page loads or when the URL hash changes (e.g., from /#features)
  useEffect(() => {
    if (location.hash) {
      const elementId = location.hash.substring(1);
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [location]);

  return (
    <div>
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center text-center min-h-[60vh]">
        <h1 className="text-5xl md:text-6xl font-bold mb-4 text-gray-100">AI Form Correction for Smarter Workouts</h1>
        <p className="text-lg text-gray-400 mb-8 max-w-2xl">Get real-time feedback to perfect your form, prevent injuries, and maximize your results.</p>
        <Link to="/session" className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg text-lg hover:bg-indigo-700 transition-all transform hover:scale-105 inline-block">
          Start Live Session
        </Link>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card title="Start New Session" icon={<LuSquarePlay size={24} />}>
          <p className="mb-4">Begin a new workout and get live feedback on your form.</p>
          <Link to="/session" className="w-full block text-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">
            Start Analysis
          </Link>
        </Card>
        <Card title="Workout History" icon={<VscHistory size={24} />}>
          <p className="mb-4">Review your past sessions and track your progress over time.</p>
          <Link to="/history" className="w-full block text-center bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">
            View History
          </Link>
        </Card>
        <Card title="Overall Posture Score" icon={<GoGoal size={24} />}>
          <p className="text-4xl font-bold text-green-400">88%</p>
          <p>Average accuracy from your last session.</p>
        </Card>
      </div>

      {/* Core Features Section */}
      <section id="features" className="mt-40 pt-12">
        <h2 className="text-3xl font-semibold text-center mb-10 text-gray-200">Core Features</h2>
        <div className="grid md:grid-cols-3 gap-8 text-center text-gray-300">
          <div>
            <FaDumbbell size={40} className="mx-auto text-indigo-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-white">Live Form Correction</h3>
            <p>Get instant audio and visual feedback on your posture.</p>
          </div>
          <div>
            <FaChartLine size={40} className="mx-auto text-indigo-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-white">Progress Tracking</h3>
            <p>Detailed analytics and charts to visualize your improvement.</p>
          </div>
          <div>
            <FaUsers size={40} className="mx-auto text-indigo-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-white">Workout History</h3>
            <p>Review past sessions to identify patterns and stay motivated.</p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="mt-16 pt-12 text-center">
        <h2 className="text-3xl font-semibold mb-8 text-gray-200">About Replic AI</h2>
        <p className="max-w-3xl mx-auto text-gray-400 leading-relaxed">
          Replic AI is your personal AI workout companion. We leverage cutting-edge computer vision to provide real-time feedback, ensuring every rep you perform is safe and effective. Our mission is to make expert-level fitness guidance accessible to everyone.
        </p>
      </section>
    </div>
  );
}

export default Dashboard;