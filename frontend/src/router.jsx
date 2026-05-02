import React, { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import RootLayout from "./layouts/RootLayout";
import Loading from "./components/Loading";
import AuthGuard from "./components/AuthGuard";

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

const AdminGuard = ({ children }) => {
  try {
    const user = JSON.parse(localStorage.getItem('registry_user') || '{}');
    if (!ADMIN_EMAIL || user.email !== ADMIN_EMAIL) return <Navigate to="/" replace />;
  } catch { return <Navigate to="/" replace />; }
  return children;
};

const Dashboard = lazy(() => import("./pages/HomeScreen"));
const AboutScreen = lazy(() => import("./pages/AboutScreen"));
const PomodoroScreen = lazy(() => import("./pages/PomodoroScreen"));
const TeamScreen = lazy(() => import("./pages/TeamScreen"));
const SettingsScreen = lazy(() => import("./pages/SettingsScreen"));
const LoginScreen = lazy(() => import("./pages/LoginScreen"));
const RegisterScreen = lazy(() => import("./pages/RegisterScreen"));
const ProfileScreen = lazy(() => import("./pages/ProfileScreen"));
const GitHubCallbackScreen = lazy(() => import("./pages/GitHubCallbackScreen"));
const GroupsScreen = lazy(() => import("./pages/GroupsScreen"));
const GroupDetailScreen = lazy(() => import("./pages/GroupDetailScreen"));
const PublicProfileScreen = lazy(() => import("./pages/PublicProfileScreen"));
const SessionsScreen = lazy(() => import("./pages/SessionsScreen"));
const AdminScreen = lazy(() => import("./pages/AdminScreen"));

const router = createBrowserRouter([
  { path: '/login', element: <Suspense fallback={<Loading />}><LoginScreen /></Suspense> },
  { path: '/register', element: <Suspense fallback={<Loading />}><RegisterScreen /></Suspense> },
  { path: '/github/callback', element: <Suspense fallback={<Loading />}><GitHubCallbackScreen /></Suspense> },
  { path: '/u/:username', element: <Suspense fallback={<Loading />}><PublicProfileScreen /></Suspense> },
  {
    path: '/',
    element: <AuthGuard><RootLayout /></AuthGuard>,
    children: [
      { index: true, element: <Suspense fallback={<Loading />}><Dashboard /></Suspense> },
      { path: 'home', element: <Suspense fallback={<Loading />}><Dashboard /></Suspense> },
      { path: 'about', element: <Suspense fallback={<Loading />}><AboutScreen /></Suspense> },
      { path: 'pomodoro', element: <Suspense fallback={<Loading />}><PomodoroScreen /></Suspense> },
      { path: 'team', element: <Suspense fallback={<Loading />}><TeamScreen /></Suspense> },
      { path: 'groups', element: <Suspense fallback={<Loading />}><GroupsScreen /></Suspense> },
      { path: 'groups/:id', element: <Suspense fallback={<Loading />}><GroupDetailScreen /></Suspense> },
      { path: 'settings', element: <Suspense fallback={<Loading />}><SettingsScreen /></Suspense> },
      { path: 'profile', element: <Suspense fallback={<Loading />}><ProfileScreen /></Suspense> },
      { path: 'sessions', element: <Suspense fallback={<Loading />}><SessionsScreen /></Suspense> },
      { path: 'admin', element: <AdminGuard><Suspense fallback={<Loading />}><AdminScreen /></Suspense></AdminGuard> },
    ],
  },
]);

export default router
