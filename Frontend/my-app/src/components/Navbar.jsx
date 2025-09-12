// src/components/Navbar.jsx

import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaSignInAlt } from 'react-icons/fa';

const Navbar = () => {
  const linkClasses = "text-gray-300 hover:text-white transition-colors duration-300";
  const activeLinkClasses = "text-indigo-400 font-semibold"; // Active link style

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-sm shadow-lg">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <NavLink to="/" className="text-2xl font-bold text-white uppercase tracking-widest">
          Replic AI
        </NavLink>

        {/* Navigation Links */}
        <div className="hidden md:flex space-x-8 items-center font-medium">
          {/* --- ADDED THIS HOME LINK --- */}
          <NavLink to="/" className={({ isActive }) => isActive ? activeLinkClasses : linkClasses}>Home</NavLink>
          
          <a href="/#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }} className={linkClasses}>Features</a>
          <a href="/#about" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }} className={linkClasses}>About</a>
          <NavLink to="/history" className={({ isActive }) => isActive ? activeLinkClasses : linkClasses}>Analytics</NavLink>
        </div>

        {/* Login Button */}
        <button className="flex items-center text-white px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105">
          <FaSignInAlt className="mr-2" />
          Login
        </button>
      </div>
    </nav>
  );
};

export default Navbar;