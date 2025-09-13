import React, { useState, useEffect, useMemo } from 'react';
import { FaCalendarAlt, FaBullseye, FaSyncAlt, FaTrophy, FaFilter } from 'react-icons/fa';

const groupSessionsByDate = (sessions) => {
    // Groups sessions by date categories
    const groups = { today: [], thisWeek: [], older: [] };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneWeekAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);

    sessions.forEach(session => {
        const sessionDate = new Date(session.completion_timestamp.$date || session.completion_timestamp);
        sessionDate.setHours(0, 0, 0, 0);

        if (sessionDate.getTime() === today.getTime()) groups.today.push(session);
        else if (sessionDate > oneWeekAgo) groups.thisWeek.push(session);
        else groups.older.push(session);
    });
    return groups;
};

const SessionCard = ({ session }) => (
    <div className="bg-gray-800 p-5 rounded-lg flex flex-col md:flex-row justify-between items-center shadow-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/40">
        <div className="mb-4 md:mb-0 text-center md:text-left">
            <p className="flex items-center text-lg font-bold text-white">
                <FaCalendarAlt className="mr-3 text-indigo-400" />
                {new Date(session.completion_timestamp.$date || session.completion_timestamp).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <p className="text-sm text-gray-400 ml-8 capitalize">{session.exercise_type.replace(/_/g, ' ')}</p>
        </div>
        <div className="flex gap-8">
            <div className="text-center">
                <p className="flex items-center text-sm text-gray-400"><FaSyncAlt className="mr-2" /> REPS</p>
                <p className="text-2xl font-bold">{session.rep_count}</p>
            </div>
            <div className="text-center">
                <p className="flex items-center text-sm text-gray-400"><FaBullseye className="mr-2" /> ACCURACY</p>
                <p className="text-2xl font-bold text-green-400">{session.average_accuracy}%</p>
            </div>
        </div>
    </div>
);

function History({ authToken }) {
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'squat', 'pushup', etc.
    
    const API_BASE_URL = 'http://127.0.0.1:5000/api';

    useEffect(() => {
        const fetchHistory = async () => {
            if (!authToken) {
                setIsLoading(false);
                return;
            }
            try {
                // The backend doesn't need a filter; we fetch all and filter on the client
                const response = await fetch(`${API_BASE_URL}/workout`, {
                    headers: { Authorization: `Bearer ${authToken}` },
                });
                if (!response.ok) throw new Error("Network response was not ok");
                const data = await response.json();
                setSessions(data);
            } catch (error) {
                console.error("Failed to fetch history:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, [authToken]);

    // useMemo will re-calculate filtered sessions only when sessions or filter change
    const filteredSessions = useMemo(() => {
        if (filter === 'all') {
            return sessions;
        }
        return sessions.filter(session => session.exercise_type === filter);
    }, [sessions, filter]);

    const groupedSessions = groupSessionsByDate(filteredSessions);
    
    const personalBests = useMemo(() => {
        if (filteredSessions.length === 0) return { mostReps: null, highestAccuracy: null };
        const mostReps = filteredSessions.reduce((prev, current) => (prev.rep_count > current.rep_count) ? prev : current);
        const highestAccuracy = filteredSessions.reduce((prev, current) => (prev.average_accuracy > current.average_accuracy) ? prev : current);
        return { mostReps, highestAccuracy };
    }, [filteredSessions]);


    if (isLoading) return <div className="text-center p-8 text-white">Loading Workout History...</div>;
    if (sessions.length === 0) return (
        <div>
            <h1 className="text-3xl font-semibold mb-8 text-gray-200">Workout History</h1>
            <p className="text-gray-400">You haven't saved any workouts yet. Go complete a session!</p>
        </div>
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-semibold text-gray-200">Workout History</h1>
                {/* NEW: Filter Dropdown */}
                <div className="flex items-center gap-2">
                    <FaFilter className="text-gray-400"/>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                    >
                        <option value="all">All Exercises</option>
                        <option value="squat">Squat</option>
                        <option value="pushup">Pushup</option>
                        <option value="bicep_curl">Bicep Curl</option>
                        <option value="lunge">Lunge</option>
                        <option value="jumping_jack">Jumping Jack</option>
                    </select>
                </div>
            </div>

            {filteredSessions.length === 0 && filter !== 'all' && (
                 <p className="text-gray-400 text-center py-8">No history found for this exercise.</p>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {groupedSessions.today.length > 0 && groupedSessions.today.map(session => <SessionCard key={session._id.$oid} session={session} />)}
                    {groupedSessions.thisWeek.length > 0 && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-400 my-3">This Week</h2>
                            <div className="space-y-4">{groupedSessions.thisWeek.map(session => <SessionCard key={session._id.$oid} session={session} />)}</div>
                        </div>
                    )}
                    {groupedSessions.older.length > 0 && (
                         <div>
                            <h2 className="text-xl font-bold text-gray-400 my-3">Older</h2>
                            <div className="space-y-4">{groupedSessions.older.map(session => <SessionCard key={session._id.$oid} session={session} />)}</div>
                        </div>
                    )}
                </div>
                
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-400">Personal Bests {filter !== 'all' && `for ${filter.replace(/_/g, ' ')}`}</h2>
                    {personalBests.mostReps ? (
                        <div className="bg-gray-800 p-5 rounded-lg">
                            <p className="flex items-center text-sm text-gray-400"><FaTrophy className="mr-2 text-yellow-400" /> MOST REPS</p>
                            <p className="text-3xl font-bold mt-1">{personalBests.mostReps.rep_count}</p>
                            <p className="text-xs text-gray-500">on {new Date(personalBests.mostReps.completion_timestamp.$date).toLocaleDateString()}</p>
                        </div>
                    ) : <p className="text-gray-500">No data available.</p>}
                    
                    {personalBests.highestAccuracy ? (
                         <div className="bg-gray-800 p-5 rounded-lg">
                            <p className="flex items-center text-sm text-gray-400"><FaTrophy className="mr-2 text-yellow-400" /> HIGHEST ACCURACY</p>
                            <p className="text-3xl font-bold mt-1">{personalBests.highestAccuracy.average_accuracy}%</p>
                             <p className="text-xs text-gray-500">on {new Date(personalBests.highestAccuracy.completion_timestamp.$date).toLocaleDateString()}</p>
                        </div>
                    ): null}
                </div>
            </div>
        </div>
    );
}

export default History;
