import React, { useState } from "react";
import { useAuth } from "../context/authContext";

const Login = () => {
  const [data, setData] = useState({ password: "", confirmPassword: "" });
  const [isLogin, setIsLogin] = useState(true);
  const { login, createAccount } = useAuth();
  const inputHandler = (e) => {
    const { name, value } = e.target;
    setData({
      ...data,
      [name]: value,
    });
  };
  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (isLogin) {
      login(data);
    } else {
      if (data.password === data.confirmPassword) {
        await createAccount(data);
        setIsLogin(true);
      } else {
        alert("Passwords do not match");
      }
    }
    setData({ password: "", confirmPassword: "" });
    console.log(data);
  };
  return (
    <div className="bg-gray-100 h-full w-full p-4 rounded flex flex-col justify-center items-center">
      <div className="w-full max-w-xs h-[50%]">
        <h2 className="text-lg font-semibold mb-2 text-center">
          {isLogin ? "Login" : "Register"}
        </h2>
        <form
          className="bg-gray-200 p-4 rounded my-8 flex flex-col gap-2"
          onSubmit={onSubmitHandler}
        >
          {isLogin ? (
            <>
              <div>
                <input
                  placeholder="Password"
                  type="password"
                  id="password"
                  name="password"
                  required
                  className="border border-gray-300 p-2 rounded w-full"
                  onChange={inputHandler}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <input
                  placeholder="Password"
                  type="password"
                  id="password"
                  name="password"
                  required
                  className="border border-gray-300 p-2 rounded w-full"
                  onChange={inputHandler}
                />
              </div>
              <div>
                <input
                  placeholder="Confirm Password"
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                  className="border border-gray-300 p-2 rounded w-full"
                  onChange={inputHandler}
                />
              </div>
            </>
          )}
          <button
            type="submit"
            className="bg-blue-500 text-white py-2 px-4 rounded mt-4"
          >
            {isLogin ? "Login" : "Register"}
          </button>
          <a
            onClick={() => {
              setIsLogin(!isLogin);
            }}
            className="text-blue-500 hover:underline cursor-pointer"
          >
            {isLogin ? "Create an account" : "Already have an account?"}
          </a>
        </form>
      </div>
    </div>
  );
};

export default Login;
