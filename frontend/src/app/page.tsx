"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { LandingPage } from "@/components/LandingPage";
import { Dashboard } from "@/components/Dashboard";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const { isConnected } = useAccount();

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return isConnected ? <Dashboard /> : <LandingPage />;
}
