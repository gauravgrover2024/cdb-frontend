import React from "react";
import { useLocation } from "react-router-dom";
import UsedCarsWorkspace from "../components/UsedCarsWorkspace";

export default function UsedCarsProcurementPage() {
  const location = useLocation();
  const stage =
    location.pathname === "/used-cars/procurement"
      ? "procurement"
      : "lead-intake";

  return <UsedCarsWorkspace stage={stage} />;
}
