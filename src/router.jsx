import React, { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import RootLayout from "./layouts/RootLayout";

const Dashboard = lazy(() => import("./pages/HomeScreen"));
const AboutScreen = lazy(() => import("./pages/AboutScreen"));
const PomodoroScreen = lazy(() => import("./pages/PomodoroScreen"));
const TeamScreen = lazy(() => import("./pages/TeamScreen"));
const SettingsScreen = lazy(() => import("./pages/SettingsScreen"));
const LoginScreen = lazy(() => import("./pages/LoginScreen"));
const RegisterScreen = lazy(() => import("./pages/RegisterScreen"));
const ProfileScreen = lazy(() => import("./pages/ProfileScreen"));

const Loading = () => <div className="flex items-center justify-center h-screen mc-body text-xs uppercase tracking-widest text-mc-ink/30">Loading Registry...</div>;

const router = createBrowserRouter([
  { path: '/login', element: <Suspense fallback={<Loading />}><LoginScreen /></Suspense> },
  { path: '/register', element: <Suspense fallback={<Loading />}><RegisterScreen /></Suspense> },
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Suspense fallback={<Loading />}><Dashboard /></Suspense> },
      { path: 'home', element: <Suspense fallback={<Loading />}><Dashboard /></Suspense> },
      { path: 'about', element: <Suspense fallback={<Loading />}><AboutScreen /></Suspense> },
      { path: 'pomodoro', element: <Suspense fallback={<Loading />}><PomodoroScreen /></Suspense> },
      { path: 'team', element: <Suspense fallback={<Loading />}><TeamScreen /></Suspense> },
      { path: 'settings/github', element: <Suspense fallback={<Loading />}><SettingsScreen /></Suspense> },
      { path: 'profile', element: <Suspense fallback={<Loading />}><ProfileScreen /></Suspense> },
    ],
  },
]);

export default router
