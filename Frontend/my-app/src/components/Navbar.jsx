import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FaSignInAlt } from 'react-icons/fa';

const Navbar = () => {
  const linkClasses = "text-gray-300 hover:text-white transition-colors duration-300";
  const activeLinkClasses = "text-indigo-400 font-semibold";

  const navigate = useNavigate();
  const location = useLocation();

  const handleScrollLink = (sectionId) => {
    // If we are already on the homepage, just scroll
    if (location.pathname === '/') {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // If we are on another page, navigate to the homepage with a hash
      // The Dashboard component will handle the scrolling
      navigate(`/#${sectionId}`);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-sm shadow-lg">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <NavLink to="/" className="text-2xl font-bold text-white uppercase tracking-widest">
          Replic AI
        </NavLink>
        <div className="hidden md:flex space-x-8 items-center font-medium">
          <NavLink to="/" className={({ isActive }) => isActive && location.hash === '' ? activeLinkClasses : linkClasses}>Home</NavLink>
          <button onClick={() => handleScrollLink('features')} className={linkClasses}>Features</button>
          <button onClick={() => handleScrollLink('about')} className={linkClasses}>About</button>
          <NavLink to="/history" className={({ isActive }) => isActive ? activeLinkClasses : linkClasses}>History</NavLink>
          <NavLink to="/progress" className={({ isActive }) => isActive ? activeLinkClasses : linkClasses}>Progress</NavLink>
        </div>
        <button className="flex items-center text-white px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105">
          <FaSignInAlt className="mr-2" />
          Login
        </button>
      </div>
    </nav>
  );
};

export default Navbar;