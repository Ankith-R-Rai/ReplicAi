import React from'react';
import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { FaCalendarAlt, FaBullseye, FaSyncAlt, FaTrophy } from 'react-icons/fa';

// This function correctly groups sessions by date. No changes needed.
const groupSessionsByDate = (sessions) => {
    const groups = { today: [], thisWeek: [], older: [] };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneWeekAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);

    sessions.forEach(session => {
        const sessionDate = new Date(session.completed_at.$date || session.completed_at);
        sessionDate.setHours(0, 0, 0, 0);

        if (sessionDate.getTime() === today.getTime()) {
            groups.today.push(session);
        } else if (sessionDate > oneWeekAgo) {
            groups.thisWeek.push(session);
        } else {
            groups.older.push(session);
        }
    });
    return groups;
};

// UPDATED: This component now displays the accuracy score.
const SessionCard = ({ session }) => (
    <div className="bg-gray-800 p-5 rounded-lg flex flex-col md:flex-row justify-between items-center shadow-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/40">
        <div className="mb-4 md:mb-0 text-center md:text-left">
            <p className="flex items-center text-lg font-bold text-white">
                <FaCalendarAlt className="mr-3 text-indigo-400" />
                {new Date(session.completed_at.$date || session.completed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <p className="text-sm text-gray-400 ml-8 capitalize">{session.exercise_type}</p>
        </div>
        <div className="flex gap-8">
            <div className="text-center">
                <p className="flex items-center text-sm text-gray-400"><FaSyncAlt className="mr-2" /> REPS</p>
                <p className="text-2xl font-bold">{session.rep_count}</p>
            </div>
            {/* This div is now active */}
            <div className="text-center">
                <p className="flex items-center text-sm text-gray-400"><FaBullseye className="mr-2" /> ACCURACY</p>
                <p className="text-2xl font-bold text-green-400">{session.average_accuracy}%</p>
            </div>
        </div>
    </div>
);

function History() {
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    // UPDATED: State now holds both personal bests
    const [personalBests, setPersonalBests] = useState({ mostReps: null, highestAccuracy: null });
    const { getAccessTokenSilently } = useAuth0();

    useEffect(() => {
        const fetchHistoryAndBests = async () => {
            try {
                const token = await getAccessTokenSilently();
                const response = await fetch("http://localhost:5000/api/history", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!response.ok) throw new Error("Network response was not ok");
                
                const data = await response.json();
                setSessions(data);

                if (data.length > 0) {
                    const mostRepsSession = data.reduce((prev, current) => 
                        (prev.rep_count > current.rep_count) ? prev : current
                    );

                    // UPDATED: Logic to find the highest accuracy session
                    const highestAccuracySession = data.reduce((prev, current) => 
                        (prev.average_accuracy > current.average_accuracy) ? prev : current
                    );
                    
                    setPersonalBests({ mostReps: mostRepsSession, highestAccuracy: highestAccuracySession });
                }

            } catch (error) {
                console.error("Failed to fetch history:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistoryAndBests();
    }, [getAccessTokenSilently]);

    if (isLoading) {
        return <div className="text-center p-8 text-white">Loading Workout History...</div>;
    }

    if (sessions.length === 0) {
        return (
            <div>
                <h1 className="text-3xl font-semibold mb-8 text-gray-200">Workout History</h1>
                <p className="text-gray-400">You haven't saved any workouts yet. Go complete a session!</p>
            </div>
        );
    }

    const groupedSessions = groupSessionsByDate(sessions);

    return (
        <div>
            <h1 className="text-3xl font-semibold mb-8 text-gray-200">Workout History</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Main Session List */}
                <div className="lg:col-span-2 space-y-8">
                    {groupedSessions.today.length > 0 && groupedSessions.today.map(session => <SessionCard key={session._id.$oid} session={session} />)}
                    
                    {groupedSessions.thisWeek.length > 0 && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-400 my-3">This Week</h2>
                            <div className="space-y-4">
                                {groupedSessions.thisWeek.map(session => <SessionCard key={session._id.$oid} session={session} />)}
                            </div>
                        </div>
                    )}
                    {groupedSessions.older.length > 0 && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-400 my-3">Older</h2>
                            <div className="space-y-4">
                                {groupedSessions.older.map(session => <SessionCard key={session._id.$oid} session={session} />)}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Stats & Bests Sidebar */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-400">Personal Bests</h2>
                    {personalBests.mostReps && (
                        <div className="bg-gray-800 p-5 rounded-lg">
                            <p className="flex items-center text-sm text-gray-400"><FaTrophy className="mr-2 text-yellow-400" /> MOST REPS</p>
                            <p className="text-3xl font-bold mt-1">{personalBests.mostReps.rep_count}</p>
                            <p className="text-xs text-gray-500">
                                on {new Date(personalBests.mostReps.completed_at.$date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>
                    )}
                    
                    {/* UPDATED: This card is now active and dynamic */}
                    {personalBests.highestAccuracy && (
                        <div className="bg-gray-800 p-5 rounded-lg">
                            <p className="flex items-center text-sm text-gray-400"><FaTrophy className="mr-2 text-yellow-400" /> HIGHEST ACCURACY</p>
                            <p className="text-3xl font-bold mt-1">{personalBests.highestAccuracy.average_accuracy}%</p>
                            <p className="text-xs text-gray-500">
                                on {new Date(personalBests.highestAccuracy.completed_at.$date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default History;