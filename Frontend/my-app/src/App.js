import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

// Import the new Navbar
import Navbar from './components/Navbar';

// Import our pages
import Dashboard from './pages/Dashboard';
import Session from './pages/Session';
import History from './pages/History';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-900 text-white font-sans">
        
        {/* Animated Gradient Background */}
        <div className="fixed inset-0 z-0 pointer-events-none animated-gradient-lines-dark" />

        {/* Main Content (sits on top of the background) */}
        <div className="relative z-10">
          <Navbar />
          <main className="container mx-auto p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/session" element={<Session />} />
              <Route path="/history" element={<History />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;