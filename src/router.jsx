import { createBrowserRouter } from "react-router-dom"
import HomeScreen from "./pages/HomeScreen";
import AboutScreen from "./pages/AboutScreen";
import RootLayout from "./layouts/RootLayout";

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomeScreen /> },
      { path: 'home', element: <HomeScreen /> },
      { path: 'about', element: <AboutScreen /> },
    ],
  },
]);

export default router
