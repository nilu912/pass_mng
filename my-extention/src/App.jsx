import { useEffect, useState } from "react";
import AuthProvider, { useAuth } from "./context/authContext";
import Home from "./pages/Home";

export default function App() {
  return (
    <AuthProvider>
      <div className="m-4 w-80 h-140 flex items-center flex-col">
        <Home />
      </div>
    </AuthProvider>
  );
}
