// src/App.jsx

import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';

// Import our pages
import Dashboard from './pages/Dashboard';
import Session from './pages/Session';
import History from './pages/History';
import Progress from './pages/Progress'; // <-- IMPORT THE NEW PAGE

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-900 text-white font-sans">
        <div className="fixed inset-0 z-0 pointer-events-none animated-gradient-lines-dark" />
        <div className="relative z-10">
          <Navbar />
          <main className="container mx-auto p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/session" element={<Session />} />
              <Route path="/history" element={<History />} />
              <Route path="/progress" element={<Progress />} /> {/* <-- ADD THE NEW ROUTE */}
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;