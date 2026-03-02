import { createBrowserRouter } from "react-router-dom"
import HomeScreen from "./pages/HomeScreen";
import AboutScreen from "./pages/AboutScreen";
import RootLayout from "./layouts/RootLayout";
import PomodoroScreen from "./pages/PomodoroScreen";

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomeScreen /> },
      { path: 'home', element: <HomeScreen /> },
      { path: 'about', element: <AboutScreen /> },
      { path: 'pomodoro', element: <PomodoroScreen /> },
    ],
  },
]);

export default router
