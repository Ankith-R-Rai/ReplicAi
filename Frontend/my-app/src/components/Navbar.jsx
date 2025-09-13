import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FaSignInAlt, FaSignOutAlt } from 'react-icons/fa';
import { useAuth0 } from '@auth0/auth0-react';

const Navbar = () => {
  const linkClasses = "text-gray-300 hover:text-white transition-colors duration-300";
  const activeLinkClasses = "text-indigo-400 font-semibold";

  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithRedirect, logout, isAuthenticated, user } = useAuth0();

  // ✅ handle smooth scroll
  const handleScrollLink = (sectionId) => {
    if (location.pathname === '/') {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(`/#${sectionId}`);
    }
  };

  // ✅ handle login with return to current path
  const handleLogin = () => {
    loginWithRedirect({ appState: { returnTo: location.pathname } });
  };

  return (
    <nav className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-sm shadow-lg">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <NavLink
          to="/"
          className="text-2xl font-bold text-white uppercase tracking-widest"
        >
          Replic AI
        </NavLink>

        {/* Navigation Links */}
        <div className="hidden md:flex space-x-8 items-center font-medium">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive && location.hash === '' ? activeLinkClasses : linkClasses
            }
          >
            Home
          </NavLink>
          <button onClick={() => handleScrollLink('features')} className={linkClasses}>
            Features
          </button>
          <button onClick={() => handleScrollLink('about')} className={linkClasses}>
            About
          </button>
          <NavLink
            to="/history"
            className={({ isActive }) => (isActive ? activeLinkClasses : linkClasses)}
          >
            History
          </NavLink>
          <NavLink
            to="/progress"
            className={({ isActive }) => (isActive ? activeLinkClasses : linkClasses)}
          >
            Progress
          </NavLink>
          <NavLink
            to="/session"
            className={({ isActive }) => (isActive ? activeLinkClasses : linkClasses)}
          >
            Session
          </NavLink>
        </div>

        {/* Auth0 Login / Logout Buttons */}
        {!isAuthenticated ? (
          <button
            onClick={handleLogin}
            className="flex items-center text-white px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105"
          >
            <FaSignInAlt className="mr-2" />
            Login
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <span className="text-gray-300 hidden sm:inline">
              👋 {user?.name || 'User'}
            </span>
            <button
              onClick={() => logout({ returnTo: window.location.origin })}
              className="flex items-center text-white px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition-all duration-300 transform hover:scale-105"
            >
              <FaSignOutAlt className="mr-2" />
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
