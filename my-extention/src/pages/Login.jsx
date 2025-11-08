import React, { useEffect, useState } from "react";
import { useAuth } from "../context/authContext";
import { BlockchainLoading } from "../components/BlockchainLoading";

const Login = () => {
  const [data, setData] = useState({ password: "", confirmPassword: "" });
  const [isLogin, setIsLogin] = useState(true);
  const {
    login,
    createAccount,
    contractStatus,
    connectWallet,
    WalletStatus,
    setPage,
    setWalletStatus,
    isLoading,
    setIsLoading,
  } = useAuth();
  // useEffect(()=>{

  // }, []);
  const inputHandler = (e) => {
    const { name, value } = e.target;
    setData({
      ...data,
      [name]: value,
    });
  };

  const onSubmitHandler = async (e) => {
    setIsLoading(true);
    e.preventDefault();
    try {
      if (isLogin) {
        await login(data);
      } else {
        if (data.password === data.confirmPassword) {
          await createAccount(data);
          setIsLogin(true);
        } else {
          alert("Passwords do not match");
          return;
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      console.log("in finally block");
      setData({ password: "", confirmPassword: "" });
      setIsLoading(false);
    }
    // console.log(data);
  };

  if (isLoading) {
    // ✅ Fixed:
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
        {/* Show loading overlay when loading or updating */}
        {(isLoading || isSubmitting || isUpdating) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <BlockchainLoading
                message={isLoading && "Loading, please wait..."}
              />
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto">
          {/* Rest of your dashboard content */}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 h-full w-full p-4 rounded flex flex-col justify-center items-center">
      <div className="w-full max-w-xs h-[50%]">
        {!WalletStatus ? (
          <>
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold mb-2 text-center">
                Connect Your Wallet
              </h2>
              <button
                className="bg-blue-500 text-white py-2 px-4 rounded mt-4 hover:shadow-lg"
                onClick={connectWallet}
              >
                Click To Connect Wallet
              </button>
            </div>
          </>
        ) : (
          <>
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
                      value={data.password}
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
                      value={data.password}
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
                      value={data.confirmPassword}
                      required
                      className="border border-gray-300 p-2 rounded w-full"
                      onChange={inputHandler}
                    />
                  </div>
                </>
              )}
              <button
                type="submit"
                className="bg-blue-500 text-white py-2 px-4 rounded mt-4 hover:shadow-lg"
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
            <button
              className="bg-red-500 text-white py-2 px-4 rounded mt-4 hover:shadow-lg"
              onClick={() => {
                chrome.storage.local.clear();
                setWalletStatus(false);
              }}
            >
              Clear Storage
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
