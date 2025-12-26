import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { LogOut, MapPin, Users, Video, StopCircle, BarChart } from 'lucide-react';

const FacultyDashboard = () => {
    const { user, logout } = useAuth();
    const [courses, setCourses] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null); // For selected course
    const [loading, setLoading] = useState(false);
    const [viewingStatsId, setViewingStatsId] = useState<string | null>(null);

    const fetchCourses = async () => {
        try {
            const { data } = await api.get('/faculty/courses');
            setCourses(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    const startSession = async (courseId: string, type: 'FACE' | 'SIMPLE') => {
        if (!navigator.geolocation) return alert('Geolocation is required');

        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                await api.post('/faculty/start-attendance', {
                    courseId,
                    type,
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                fetchCourses();
                alert('Session started!');
            } catch (err: any) {
                alert(err.response?.data?.message || 'Failed to start');
            }
        }, (err) => {
            alert('Location access denied: ' + err.message);
        });
    };

    const stopSession = async (sessionId: string) => {
        try {
            await api.post('/faculty/stop-attendance', { sessionId });
            fetchCourses();
            alert('Session stopped');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to stop');
        }
    };

    const viewStats = async (courseId: string) => {
        if (viewingStatsId === courseId) {
            setViewingStatsId(null);
            setStats(null);
            return;
        }
        setViewingStatsId(courseId);
        try {
            const { data } = await api.get(`/faculty/attendance-stats/${courseId}`);
            setStats(data);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Bar */}
            <header className="bg-white shadow p-4 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Faculty Dashboard</h1>
                    <p className="text-sm text-gray-500">{user?.name} | {user?.email}</p>
                </div>
                <button onClick={logout} className="flex items-center text-red-600 hover:text-red-800">
                    <LogOut size={18} className="mr-2" /> Logout
                </button>
            </header>

            {/* Content */}
            <main className="p-6 max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map(course => (
                        <div key={course._id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                            <div className="p-5">
                                <h3 className="text-lg font-bold text-gray-900 mb-1">{course.course_name}</h3>
                                <div className="flex items-center text-sm text-gray-500 mb-4">
                                    <Users size={16} className="mr-1" /> {course.enrolledCount} Students Enrolled
                                </div>

                                {course.activeSession ? (
                                    <div className="bg-green-50 p-3 rounded-lg border border-green-200 mb-4">
                                        <div className="flex items-center text-green-700 font-medium mb-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
                                            Session Active
                                        </div>
                                        <button
                                            onClick={() => stopSession(course.activeSession)}
                                            className="w-full flex items-center justify-center bg-red-500 text-white py-2 rounded hover:bg-red-600 transition"
                                        >
                                            <StopCircle size={18} className="mr-2" /> Stop Session
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2 mb-4">
                                        <button
                                            onClick={() => startSession(course._id, 'FACE')}
                                            className="flex flex-col items-center justify-center p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition"
                                        >
                                            <Video size={20} className="mb-1 text-blue-600" />
                                            <span className="text-xs font-medium">Face Attendance</span>
                                        </button>
                                        <button
                                            onClick={() => startSession(course._id, 'SIMPLE')}
                                            className="flex flex-col items-center justify-center p-3 border rounded-lg hover:bg-green-50 hover:border-green-300 transition"
                                        >
                                            <MapPin size={20} className="mb-1 text-green-600" />
                                            <span className="text-xs font-medium">Simple Attendance</span>
                                        </button>
                                    </div>
                                )}

                                <button
                                    onClick={() => viewStats(course._id)}
                                    className="w-full text-center text-sm text-gray-600 hover:text-blue-600 flex items-center justify-center"
                                >
                                    <BarChart size={16} className="mr-1" /> {viewingStatsId === course._id ? 'Hide Details' : 'View Details'}
                                </button>
                            </div>

                            {/* Stats Expansion */}
                            {viewingStatsId === course._id && stats && (
                                <div className="bg-gray-50 p-4 border-t max-h-96 overflow-y-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-100">
                                            <tr>
                                                <th className="px-2 py-1">Student</th>
                                                <th className="px-2 py-1">Present</th>
                                                <th className="px-2 py-1">%</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.stats.map((s: any) => (
                                                <tr key={s.studentId} className="border-b">
                                                    <td className="px-2 py-2 font-medium">{s.name}</td>
                                                    <td className="px-2 py-2">{s.totalPresent}</td>
                                                    <td className={`px-2 py-2 font-bold ${parseFloat(s.percentage) < 75 ? 'text-red-500' : 'text-green-600'}`}>
                                                        {s.percentage}%
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default FacultyDashboard;
