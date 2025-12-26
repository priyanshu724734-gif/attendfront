import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { LogOut, Camera, MapPin } from 'lucide-react';
import FaceCamera from '../components/FaceCamera';

const StudentDashboard = () => {
    const { user, logout } = useAuth();
    const [courses, setCourses] = useState<any[]>([]);
    const [showCamera, setShowCamera] = useState(false);
    const [cameraMode, setCameraMode] = useState<'REGISTER' | 'ATTENDANCE'>('REGISTER');
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

    const [hasFaceData, setHasFaceData] = useState(false);

    const fetchCourses = async () => {
        try {
            const { data } = await api.get('/student/courses');
            // Check if response has new structure
            if (data.courses) {
                setCourses(data.courses);
                setHasFaceData(data.hasFaceData);
            } else {
                setCourses(data); // Fallback
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    const handleRegisterFace = () => {
        setCameraMode('REGISTER');
        setShowCamera(true);
    };

    const handleApplyAttendance = (course: any) => {
        if (!course.activeSession) return;

        setActiveSessionId(course.activeSession.id);

        if (course.activeSession.type === 'FACE') {
            setCameraMode('ATTENDANCE');
            setShowCamera(true);
        } else {
            // Simple attendance
            submitAttendance(null);
        }
    };

    const submitAttendance = async (faceDescriptor: any | null) => {
        if (!navigator.geolocation) {
            alert('❌ Geolocation is required for attendance. Please enable location services.');
            setShowCamera(false);
            return;
        }

        // STRONG Device Fingerprint - Multiple factors
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info');
        const renderer = debugInfo ? gl?.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';

        const deviceFingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            screen.colorDepth,
            new Date().getTimezoneOffset(),
            renderer,
            navigator.hardwareConcurrency || 0,
            navigator.platform
        ].join('|');

        console.log('Device Fingerprint:', deviceFingerprint);

        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                await api.post('/student/apply-attendance', {
                    sessionId: activeSessionId,
                    faceDescriptor: faceDescriptor ? Array.from(faceDescriptor) : null,
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    deviceFingerprint,
                    isVpn: false, // Mock
                    isDevMode: false // Mock
                });
                alert('✅ Attendance Marked Successfully!');
                setShowCamera(false);
                fetchCourses(); // Refresh to show updated status
            } catch (err: any) {
                const errorMsg = err.response?.data?.message || 'Failed to mark attendance';
                alert('❌ ' + errorMsg);
                setShowCamera(false);
            }
        }, (error) => {
            console.error('Geolocation error:', error);
            alert('❌ Location access denied. Please enable location permissions and try again.');
            setShowCamera(false);
        }, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    };

    const onFaceCaptured = async (descriptor: any) => {
        if (cameraMode === 'REGISTER') {
            try {
                await api.post('/student/register-face', {
                    faceDescriptor: Array.from(descriptor)
                });
                alert('Face Registered Successfully');
                setShowCamera(false);
                fetchCourses(); // Update hasFaceData
            } catch {
                alert('Failed to register face');
            }
        } else {
            submitAttendance(descriptor);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow p-4 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Student Dashboard</h1>
                    <p className="text-sm text-gray-500">{user?.name} | {user?.email}</p>
                </div>
                <div className="flex items-center space-x-4">
                    {!hasFaceData && (
                        <button onClick={handleRegisterFace} className="text-blue-600 hover:text-blue-800 font-medium px-4 py-2 bg-blue-50 rounded-lg animate-pulse">
                            ⚠️ Register Face ID
                        </button>
                    )}
                    <button onClick={logout} className="text-red-600 hover:text-red-800">
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            <main className="p-6 max-w-6xl mx-auto">
                {showCamera && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl overflow-hidden w-full max-w-2xl">
                            <div className="p-4 bg-gray-100 flex justify-between">
                                <h3 className="font-bold">
                                    {cameraMode === 'REGISTER' ? 'Register Face' : 'Verifying Identity...'}
                                </h3>
                                <button onClick={() => setShowCamera(false)} className="text-gray-500">Close</button>
                            </div>
                            <div className="p-4">
                                <FaceCamera onCapture={onFaceCaptured} mode={cameraMode} />
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course: any) => (
                        <div key={course.courseId} className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{course.courseName}</h3>
                                    <p className="text-sm text-gray-500">{course.facultyName}</p>
                                </div>
                                <div className={`text-lg font-bold ${parseFloat(course.attendancePercentage) < 75 ? 'text-red-500' : 'text-green-600'}`}>
                                    {course.attendancePercentage}%
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded p-3 mb-4 text-sm flex justify-between text-gray-600">
                                <span>Total Classes: <strong>{course.totalClasses}</strong></span>
                                <span>Attended: <strong>{course.attendedClasses}</strong></span>
                            </div>

                            <button
                                disabled={!course.activeSession || course.activeSession?.hasMarkedAttendance}
                                onClick={() => handleApplyAttendance(course)}
                                className={`w-full py-2 rounded font-medium flex items-center justify-center transition
                                    ${course.activeSession?.hasMarkedAttendance
                                        ? 'bg-green-100 text-green-700 border-2 border-green-300 cursor-not-allowed'
                                        : course.activeSession
                                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                            >
                                {course.activeSession?.hasMarkedAttendance ? (
                                    <>
                                        ✓ Attendance Submitted
                                    </>
                                ) : course.activeSession ? (
                                    <>
                                        {course.activeSession.type === 'FACE' ? <Camera size={18} className="mr-2" /> : <MapPin size={18} className="mr-2" />}
                                        Mark Attendance
                                    </>
                                ) : (
                                    'No Active Session'
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default StudentDashboard;
