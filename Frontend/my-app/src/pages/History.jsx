import React from 'react';
import { FaCalendarAlt, FaBullseye, FaSyncAlt, FaTrophy } from 'react-icons/fa';

const mockSessions = [
  { date: new Date(), exercise: 'Squats', reps: 50, accuracy: '92%' },
  { date: new Date(new Date().setDate(new Date().getDate() - 1)), exercise: 'Squats', reps: 45, accuracy: '88%' },
  { date: new Date(new Date().setDate(new Date().getDate() - 4)), exercise: 'Squats', reps: 40, accuracy: '85%' },
  { date: new Date(new Date().setDate(new Date().getDate() - 10)), exercise: 'Squats', reps: 35, accuracy: '81%' },
  { date: new Date(new Date().setDate(new Date().getDate() - 12)), exercise: 'Squats', reps: 38, accuracy: '79%' },
];

const groupSessionsByDate = (sessions) => {
  const groups = { today: [], thisWeek: [], older: [] };
  const today = new Date();
  const oneWeekAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);

  sessions.forEach(session => {
    const sessionDate = new Date(session.date);
    if (sessionDate.toDateString() === today.toDateString()) {
      groups.today.push(session);
    } else if (sessionDate > oneWeekAgo) {
      groups.thisWeek.push(session);
    } else {
      groups.older.push(session);
    }
  });
  return groups;
};

const SessionCard = ({ session }) => (
  <div className="bg-gray-800 p-5 rounded-lg flex flex-col md:flex-row justify-between items-center shadow-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/40">
    <div className="mb-4 md:mb-0 text-center md:text-left">
      <p className="flex items-center text-lg font-bold text-white">
        <FaCalendarAlt className="mr-3 text-indigo-400" />
        {new Date(session.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      </p>
      <p className="text-sm text-gray-400 ml-8">{session.exercise}</p>
    </div>
    <div className="flex gap-8">
      <div className="text-center">
        <p className="flex items-center text-sm text-gray-400"><FaSyncAlt className="mr-2" /> REPS</p>
        <p className="text-2xl font-bold">{session.reps}</p>
      </div>
      <div className="text-center">
        <p className="flex items-center text-sm text-gray-400"><FaBullseye className="mr-2" /> ACCURACY</p>
        <p className="text-2xl font-bold text-green-400">{session.accuracy}</p>
      </div>
    </div>
  </div>
);

function History() {
  const groupedSessions = groupSessionsByDate(mockSessions);

  return (
    <div>
      <h1 className="text-3xl font-semibold mb-8 text-gray-200">Workout History</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Session List */}
        <div className="lg:col-span-2 space-y-8">
          {groupedSessions.today.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-400 mb-3">Today</h2>
              <div className="space-y-4">
                {groupedSessions.today.map((session, index) => <SessionCard key={`today-${index}`} session={session} />)}
              </div>
            </div>
          )}
          {groupedSessions.thisWeek.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-400 mb-3">This Week</h2>
              <div className="space-y-4">
                {groupedSessions.thisWeek.map((session, index) => <SessionCard key={`week-${index}`} session={session} />)}
              </div>
            </div>
          )}
          {groupedSessions.older.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-400 mb-3">Older</h2>
              <div className="space-y-4">
                {groupedSessions.older.map((session, index) => <SessionCard key={`older-${index}`} session={session} />)}
              </div>
            </div>
          )}
        </div>
        
        {/* Stats & Bests Sidebar */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-400">Personal Bests</h2>
          <div className="bg-gray-800 p-5 rounded-lg">
            <p className="flex items-center text-sm text-gray-400"><FaTrophy className="mr-2 text-yellow-400" /> MOST REPS</p>
            <p className="text-3xl font-bold mt-1">50</p>
            <p className="text-xs text-gray-500">on Sep 12, 2025</p>
          </div>
          <div className="bg-gray-800 p-5 rounded-lg">
            <p className="flex items-center text-sm text-gray-400"><FaTrophy className="mr-2 text-yellow-400" /> HIGHEST ACCURACY</p>
            <p className="text-3xl font-bold mt-1">92%</p>
            <p className="text-xs text-gray-500">on Sep 12, 2025</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default History;