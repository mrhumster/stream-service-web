import { MainLayout } from "./layouts/MainLayout";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { MainPage } from "./pages/MainPage";
import { StreamsPage } from "./pages/StreamsPage";
import { CreateStreamPage } from "./pages/CreateStreamPage";
import { EditStreamPage } from "./pages/EditStreamPage";
import { StreamPage } from "./pages/StreamPage";
import { ProtectedRoute } from "./components/protected-route";
import { ThemeProvider } from "@/components/theme-provider";
import { OwnStreamsPage } from "./pages/OwnStreamsPage";
import { Toaster } from "sonner";

const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      { path: "/", element: <MainPage /> },
      { path: "/streams", element: <StreamsPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "/streams/own", element: <OwnStreamsPage /> },
          { path: "/streams/create", element: <CreateStreamPage /> },
          { path: "/streams/:id/edit", element: <EditStreamPage /> },
        ],
      },
      { path: "/streams/:id", element: <StreamPage /> },
    ],
  },
]);

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <RouterProvider router={router} />
      <Toaster position="bottom-left" richColors={false} />
    </ThemeProvider>
  );
}

export default App;
