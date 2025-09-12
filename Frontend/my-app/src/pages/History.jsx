// src/pages/History.jsx

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../components/Card';
import { LiaChartBarSolid } from 'react-icons/lia';
import { GoGoal } from 'react-icons/go';

// --- MOCK DATA ---
// This is fake data. Later, your teammate's backend will provide this.
const workoutData = [
  { date: 'Sep 1', reps: 30, accuracy: 85 },
  { date: 'Sep 3', reps: 35, accuracy: 88 },
  { date: 'Sep 5', reps: 32, accuracy: 90 },
  { date: 'Sep 7', reps: 40, accuracy: 92 },
  { date: 'Sep 9', reps: 45, accuracy: 91 },
  { date: 'Sep 11', reps: 48, accuracy: 94 },
];

function History() {
  return (
    <div>
      <h1 className="text-3xl font-semibold mb-6">Workout History</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card title="Personal Best" icon={<GoGoal size={24} />}>
          <p className="text-4xl font-bold">48 Reps</p>
          <p>Achieved on Sep 11</p>
        </Card>
        <Card title="Average Accuracy" icon={<LiaChartBarSolid size={24} />}>
          <p className="text-4xl font-bold text-green-400">90%</p>
          <p>Across all sessions</p>
        </Card>
      </div>

      <Card title="Progress Over Time">
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={workoutData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
              <XAxis dataKey="date" stroke="#E2E8F0" />
              <YAxis stroke="#E2E8F0" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1A202C', 
                  border: '1px solid #4A5568' 
                }} 
              />
              <Legend />
              <Line type="monotone" dataKey="reps" stroke="#8884d8" strokeWidth={2} name="Total Reps" />
              <Line type="monotone" dataKey="accuracy" stroke="#82ca9d" strokeWidth={2} name="Accuracy (%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

export default History;