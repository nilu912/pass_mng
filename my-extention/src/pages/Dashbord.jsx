import React, { useEffect, useState } from "react";
import { useAuth } from "../context/authContext";
const Dashboard = () => {
  const [user, setUser] = useState(null);
  const {logout} = useAuth();
  useEffect(() => {
    chrome.storage.local.get("user", (data) => {
      setUser(data);
      console.log(data);
    });
  }, []);
  return (
    <div>
      <h1>Dashboard</h1>
      {/* {user && <p>Welcome, {user.user.email}!</p>} */}
      <button onClick={() => logout()} className="bg-red-500 text-white py-2 px-4 rounded mt-4">Logout</button>
    </div>
  );
};

export default Dashboard;
