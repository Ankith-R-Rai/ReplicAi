import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react'; // Import the useAuth0 hook
import Navbar from './components/Navbar';

// Import your page components
import Dashboard from './pages/Dashboard';
import Session from './pages/Session';
import History from './pages/History';
import Progress from './pages/Progress'; 

function App() {
  // State to hold the actual authentication token
  const [authToken, setAuthToken] = useState(null);
  
  // Destructure functions and state from the Auth0 hook
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  // This effect hook runs when the component mounts or when the user's 
  // authentication status changes.
  useEffect(() => {
    const fetchAuthToken = async () => {
      try {
        // Silently get the access token from Auth0. This token is needed to 
        // securely call your backend API.
        const token = await getAccessTokenSilently({
          audience: process.env.REACT_APP_AUTH0_AUDIENCE, // Make sure this is in your .env.local
          scope: 'read:current_user', // Example scope, adjust if needed
        });
        setAuthToken(token);
        console.log('✅ Auth0 Access Token successfully retrieved.');
      } catch (e) {
        console.error('❌ Error getting access token from Auth0:', e);
      }
    };

    // We only want to fetch the token if the user is logged in.
    if (isAuthenticated) {
      fetchAuthToken();
    }
  }, [getAccessTokenSilently, isAuthenticated]); // Dependencies array: rerun if these change

  return (
    <Router>
      <div className="min-h-screen bg-gray-900 text-white font-sans">
        <div className="fixed inset-0 z-0 pointer-events-none animated-gradient-lines-dark" />
        <div className="relative z-10">
          <Navbar />
          <main className="container mx-auto p-6">
            <Routes>
              {/* Public route */}
              <Route path="/" element={<Dashboard />} />
              
              {/* Protected routes that require the auth token */}
              <Route path="/session" element={<Session authToken={authToken} />} />
              <Route path="/history" element={<History authToken={authToken} />} />
              <Route path="/progress" element={<Progress authToken={authToken} />} /> 
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;