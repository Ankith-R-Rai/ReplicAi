import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { FaDownload, FaChartLine, FaLightbulb } from 'react-icons/fa';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const mockSessions = [
  { date: new Date(new Date().setDate(new Date().getDate() - 12)), reps: 38, accuracy: '79%', exercise: 'Squats' },
  { date: new Date(new Date().setDate(new Date().getDate() - 10)), reps: 35, accuracy: '81%', exercise: 'Squats' },
  { date: new Date(new Date().setDate(new Date().getDate() - 4)), reps: 40, accuracy: '85%', exercise: 'Squats' },
  { date: new Date(new Date().setDate(new Date().getDate() - 1)), reps: 45, accuracy: '88%', exercise: 'Squats' },
  { date: new Date(), reps: 50, accuracy: '92%', exercise: 'Squats' },
];

const chartData = {
  labels: mockSessions.map(s => new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
  datasets: [
    {
      label: 'Accuracy Over Time',
      data: mockSessions.map(s => parseInt(s.accuracy)),
      borderColor: 'rgba(79, 70, 229, 1)',
      backgroundColor: 'rgba(79, 70, 229, 0.2)',
      fill: true,
      tension: 0.4,
    },
  ],
};

const chartOptions = {
  responsive: true,
  plugins: { legend: { labels: { color: '#D1D5DB' } } },
  scales: {
    x: { ticks: { color: '#9CA3AF' }, grid: { color: '#374151' } },
    y: { ticks: { color: '#9CA3AF' }, grid: { color: '#374151' }, min: 50, max: 100 },
  },
};

const handleDownload = () => {
  const headers = "Date,Exercise,Reps,Accuracy\n";
  const csvContent = mockSessions.map(s => 
    `${new Date(s.date).toLocaleDateString()},${s.exercise},${s.reps},${s.accuracy}`
  ).join('\n');
  
  const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'workout_progress.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

function Progress() {
  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-semibold text-gray-200">Progress & Reports</h1>
        <button onClick={handleDownload} className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">
          <FaDownload className="mr-2" />
          Download CSV
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg shadow-lg">
          <Line options={chartOptions} data={chartData} />
        </div>

        {/* Insights Sidebar */}
        <div className="space-y-6">
          <div className="bg-gray-800 p-5 rounded-lg">
            <h3 className="flex items-center text-lg font-bold text-gray-300 mb-3"><FaChartLine className="mr-2 text-indigo-400"/> Analysis</h3>
            <p className="text-sm text-gray-400">Your accuracy shows a strong <span className="text-green-400 font-semibold">upward trend</span>. Keep focusing on depth to maintain this progress!</p>
          </div>
          <div className="bg-gray-800 p-5 rounded-lg">
            <h3 className="flex items-center text-lg font-bold text-gray-300 mb-3"><FaLightbulb className="mr-2 text-yellow-400"/> Pro Tip</h3>
            <p className="text-sm text-gray-400">Try to initiate the squat by pushing your hips back, not by bending your knees first. This helps maintain balance and protect your joints.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Progress;