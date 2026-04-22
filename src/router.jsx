import { createBrowserRouter } from "react-router-dom"
import Dashboard from "./pages/HomeScreen";
import AboutScreen from "./pages/AboutScreen";
import RootLayout from "./layouts/RootLayout";
import PomodoroScreen from "./pages/PomodoroScreen";
import TeamScreen from "./pages/TeamScreen";
import SettingsScreen from "./pages/SettingsScreen";

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'home', element: <Dashboard /> },
      { path: 'about', element: <AboutScreen /> },
      { path: 'pomodoro', element: <PomodoroScreen /> },
      { path: 'team', element: <TeamScreen /> },
      { path: 'settings/github', element: <SettingsScreen /> },
    ],
  },
]);

export default router
