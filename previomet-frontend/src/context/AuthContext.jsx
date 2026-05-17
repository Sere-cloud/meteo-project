// src/context/AuthContext.jsx
import { createContext, useContext, useState } from 'react';
import { login as apiLogin } from '../api/auth';

const AuthContext = createContext(null);
export { AuthContext }; // ← permet import { AuthContext } dans les nouveaux fichiers

export function AuthProvider({ children }) {

  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    return {
      token,
      role:            localStorage.getItem('role'),
      username:        localStorage.getItem('username'),
      ville:           localStorage.getItem('ville'),
      ville_reference: localStorage.getItem('ville_reference'),
    };
  });

  const login = async (email, password) => {
    const response = await apiLogin({ email, password });
    const data = response.data;

    localStorage.setItem('access_token',    data.access_token);
    localStorage.setItem('role',            data.role);
    localStorage.setItem('username',        data.username);
    localStorage.setItem('ville',           data.ville);
    localStorage.setItem('ville_reference', data.ville_reference ?? '');

    setUser({
      token:           data.access_token,
      role:            data.role,
      username:        data.username,
      ville:           data.ville,
      ville_reference: data.ville_reference,
    });

    return data.role;
  };

  const logout = () => {
    ['access_token', 'role', 'username', 'ville', 'ville_reference']
      .forEach((key) => localStorage.removeItem(key));
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);