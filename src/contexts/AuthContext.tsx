import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Mirrors backend User type structure
export interface User {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    jobTitle: string;
    role: string;
    isActive: boolean;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    error: string | null;
}

interface AuthContextType extends AuthState {
    login: (token: string, userData: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AuthState>({
        user: null,
        token: localStorage.getItem('taskpro_token'),
        isLoading: true,
        error: null,
    });

    useEffect(() => {
        const verifyToken = async () => {
            if (!state.token) {
                setState(prev => ({ ...prev, isLoading: false }));
                return;
            }

            try {
                const response = await fetch('/api/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${state.token}`
                    }
                });

                if (response.ok) {
                    const user = await response.json();
                    setState({ user, token: state.token, isLoading: false, error: null });
                } else {
                    // Token is invalid/expired
                    localStorage.removeItem('taskpro_token');
                    setState(s => ({ ...s, user: null, token: null, isLoading: false }));
                }
            } catch (err) {
                setState(prev => ({ ...prev, isLoading: false, error: 'Failed to connect to authentication server' }));
            }
        };

        verifyToken();
    }, [state.token]);

    const login = (token: string, user: User) => {
        localStorage.setItem('taskpro_token', token);
        setState({ user, token, isLoading: false, error: null });
    };

    const logout = () => {
        localStorage.removeItem('taskpro_token');
        setState({ user: null, token: null, isLoading: false, error: null });
    };

    return (
        <AuthContext.Provider value={{ ...state, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
