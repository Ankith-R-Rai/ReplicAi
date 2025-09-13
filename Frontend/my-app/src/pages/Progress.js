import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function Progress({ authToken }) {
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('squat'); // Default to showing progress for squats

    const API_BASE_URL = 'http://127.0.0.1:5000/api';

    useEffect(() => {
        const fetchHistory = async () => {
            if (!authToken) {
                setIsLoading(false);
                return;
            }
            try {
                const response = await fetch(`${API_BASE_URL}/workout`, {
                    headers: { Authorization: `Bearer ${authToken}` },
                });
                if (!response.ok) throw new Error("Network response was not ok");
                const data = await response.json();
                setSessions(data);
            } catch (error) {
                console.error("Failed to fetch history for progress:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, [authToken]);
    
    // This hook processes the raw session data into a format suitable for charting.
    // It only recalculates when the session data or the filter changes.
    const chartData = useMemo(() => {
        return sessions
            .filter(s => s.exercise_type === filter) // Filter by selected exercise
            .sort((a, b) => new Date(a.completion_timestamp.$date) - new Date(b.completion_timestamp.$date)) // Sort by date
            .map(s => ({
                // Format the data points for the chart
                date: new Date(s.completion_timestamp.$date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                reps: s.rep_count,
                accuracy: s.average_accuracy,
            }));
    }, [sessions, filter]);

    if (isLoading) {
        return <div className="text-center p-8 text-white">Loading Progress Data...</div>;
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h1 className="text-3xl font-semibold text-gray-200">Your Progress</h1>
                <div className="flex items-center gap-2">
                    <label htmlFor="progress-filter" className="text-gray-400">Exercise:</label>
                    <select
                        id="progress-filter"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                    >
                        <option value="squat">Squat</option>
                        <option value="pushup">Pushup</option>
                        <option value="bicep_curl">Bicep Curl</option>
                        <option value="lunge">Lunge</option>
                        <option value="jumping_jack">Jumping Jack</option>
                    </select>
                </div>
            </div>

            {/* Conditionally render charts or a placeholder message */}
            {chartData.length > 1 ? (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Reps Chart */}
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-bold mb-4 text-white capitalize">{filter.replace(/_/g, ' ')} - Reps Over Time</h2>
                         <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
                                <XAxis dataKey="date" stroke="#A0AEC0" />
                                <YAxis stroke="#A0AEC0" />
                                <Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #2D3748' }}/>
                                <Legend />
                                <Line type="monotone" dataKey="reps" stroke="#8884d8" strokeWidth={2} name="Good Reps" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Accuracy Chart */}
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-bold mb-4 text-white capitalize">{filter.replace(/_/g, ' ')} - Accuracy Over Time</h2>
                         <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
                                <XAxis dataKey="date" stroke="#A0AEC0" />
                                <YAxis domain={[0, 100]} stroke="#A0AEC0" />
                                <Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #2D3748' }}/>
                                <Legend />
                                <Line type="monotone" dataKey="accuracy" stroke="#82ca9d" strokeWidth={2} name="Accuracy (%)" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            ) : (
                <div className="text-center text-gray-400 bg-gray-800 rounded-lg p-16">
                    <h2 className="text-2xl font-bold text-white mb-2">Not Enough Data</h2>
                    <p>Complete at least two '{filter.replace(/_/g, ' ')}' sessions to see your progress chart.</p>
                </div>
            )}
        </div>
    );
}

export default Progress;

