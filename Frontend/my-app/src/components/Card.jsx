// src/components/Card.jsx

import React from 'react';
import { motion } from 'framer-motion';

function Card({ title, icon, children }) {
  return (
    <motion.div 
      className="bg-surface/50 backdrop-blur-md border border-gray-800 rounded-lg p-6 
                 transition-all duration-300 group hover:border-primary 
                 hover:shadow-[0_0_15px_rgba(37,99,235,0.4)]" // Glow effect
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
    >
      <div className="flex items-center mb-4">
        {icon && <div className="text-primary mr-3 transition-colors duration-300 group-hover:text-white">{icon}</div>}
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
      </div>
      <div className="text-subtle">
        {children}
      </div>
    </motion.div>
  );
}

export default Card;