import { Link } from "react-router";
import { BotIcon } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import CenterBox from "@/components/center-box";

export default function Home() {
  const { logout } = useAuth();

  return <div></div>;
}
