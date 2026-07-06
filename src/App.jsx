import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Layout }         from './layout/Layout';
import { Login }          from './pages/Login';
import { Dashboard }      from './pages/Dashboard';
import { Businesses }     from './pages/Businesses';
import { BusinessDetail } from './pages/BusinessDetail';
import { Settings }       from './pages/Settings';

function ProtectedLayout() {
  const authToken = useSelector(s => s.auth.authToken);
  if (!authToken) return <Navigate to="/login" replace />;
  return <Layout><Outlet /></Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"      element={<Dashboard />} />
        <Route path="/businesses"     element={<Businesses />} />
        <Route path="/businesses/:id" element={<BusinessDetail />} />
        <Route path="/settings"       element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
