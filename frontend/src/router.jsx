import React, { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import RootLayout from "./layouts/RootLayout";
import Loading from "./components/Loading";
import AuthGuard from "./components/AuthGuard";

const Dashboard = lazy(() => import("./pages/HomeScreen"));
const AboutScreen = lazy(() => import("./pages/AboutScreen"));
const PomodoroScreen = lazy(() => import("./pages/PomodoroScreen"));
const TeamScreen = lazy(() => import("./pages/TeamScreen"));
const SettingsScreen = lazy(() => import("./pages/SettingsScreen"));
const LoginScreen = lazy(() => import("./pages/LoginScreen"));
const RegisterScreen = lazy(() => import("./pages/RegisterScreen"));
const ProfileScreen = lazy(() => import("./pages/ProfileScreen"));
const GitHubCallbackScreen = lazy(() => import("./pages/GitHubCallbackScreen"));

const router = createBrowserRouter([
  { path: '/login', element: <Suspense fallback={<Loading />}><LoginScreen /></Suspense> },
  { path: '/register', element: <Suspense fallback={<Loading />}><RegisterScreen /></Suspense> },
  { path: '/github/callback', element: <Suspense fallback={<Loading />}><GitHubCallbackScreen /></Suspense> },
  {
    path: '/',
    element: <AuthGuard><RootLayout /></AuthGuard>,
    children: [
      { index: true, element: <Suspense fallback={<Loading />}><Dashboard /></Suspense> },
      { path: 'home', element: <Suspense fallback={<Loading />}><Dashboard /></Suspense> },
      { path: 'about', element: <Suspense fallback={<Loading />}><AboutScreen /></Suspense> },
      { path: 'pomodoro', element: <Suspense fallback={<Loading />}><PomodoroScreen /></Suspense> },
      { path: 'team', element: <Suspense fallback={<Loading />}><TeamScreen /></Suspense> },
      { path: 'settings', element: <Suspense fallback={<Loading />}><SettingsScreen /></Suspense> },
      { path: 'profile', element: <Suspense fallback={<Loading />}><ProfileScreen /></Suspense> },
    ],
  },
]);

export default router
