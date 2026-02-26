import React, { useEffect, useContext } from "react";
import { AuthContext } from "../context/_AuthContext";
import { router } from "expo-router";

export default function Logout() {
  const { logout } = useContext(AuthContext);

  useEffect(() => {
    (async () => {
      await logout();
      router.replace("/login");
    })();
  }, []);

  return null;
}
