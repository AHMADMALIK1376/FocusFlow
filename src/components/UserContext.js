import React, { createContext, useContext, useState } from "react";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userName, setUserNameState] = useState(
    () => localStorage.getItem("focus_username") || null
  );

  const setUserName = (name) => {
    setUserNameState(name);
    if (name) {
      localStorage.setItem("focus_username", name);
    } else {
      localStorage.removeItem("focus_username");
    }
  };

  const logout = () => {
    setUserName(null);
  };

  return (
    <UserContext.Provider value={{ userName, setUserName, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);