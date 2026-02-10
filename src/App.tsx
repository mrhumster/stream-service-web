import { MainLayout } from "./layouts/MainLayout";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { MainPage } from "./pages/MainPage";
import { ThemeProvider } from "@/components/theme-provider";

const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [{ path: "/", element: <MainPage /> }],
  },
]);

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <RouterProvider router={router} />;
    </ThemeProvider>
  );
}

export default App;
