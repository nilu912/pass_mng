import React from "react";
import { useAuth } from "../context/authContext";
import Login from "./login";
import Dashboard from "./dashbord";

const Home = () => {
  const { page } = useAuth();

  return (
    <>
      {page === "dashboard" ? (
        <Dashboard />
      ) : page === "login" ? (
        <Login />
      ) : null}
    </>
  );
};

export default Home;
