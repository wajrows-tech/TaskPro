import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Camera, Lock, User, AlertCircle, Loader, Shield, Eye, EyeOff } from 'lucide-react';

export function Login() {
    const { login, error: authError } = useAuth();
    const [email, setEmail] = useState('admin@taskpro.local');
    const [password, setPassword] = useState('password123'); // Pre-filled for development
    const [isLoading, setIsLoading] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                login(data.token, data.user);
            } else {
                setLocalError(data.message || 'Login failed. Please check your credentials.');
            }
        } catch (err) {
            setLocalError('Network error. Ensure the backend server is running.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg border border-gray-100">

                {/* Header Logo Area */}
                <div className="flex flex-col items-center">
                    <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-md mb-4 rotate-3 hover:rotate-6 transition-transform">
                        <Camera className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
                        TaskPro
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-500">
                        Sign in to access your operations dashboard
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {/* Error Display */}
                    {(localError || authError) && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md flex items-start">
                            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                            <p className="text-sm text-red-700 font-medium">
                                {localError || authError}
                            </p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                                Email Address
                            </label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
                                Password
                            </label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-3 text-[#1A1A2E] mb-2">
                        <Shield className="w-8 h-8 text-[#1A1A2E]" />
                        <h1 className="text-3xl font-bold font-mono tracking-tight text-[#1A1A2E]">
                            TaskPro
                        </h1>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                name="remember-me"
                                type="checkbox"
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                                Remember me
                            </label>
                        </div>

                        <div className="text-sm">
                            <a href="#" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                                Forgot password?
                            </a>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <Loader className="h-5 w-5 animate-spin text-white" />
                            ) : (
                                'Sign in securely'
                            )}
                        </button>
                    </div>
                </form>

                <div className="text-center text-xs text-gray-500 font-mono mt-8">
                    <p>Protected by TaskPro Encryption</p>
                    <p className="mt-1">© 2026 TaskPro Corporation. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}
