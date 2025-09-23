import { Link } from "react-router";
import { BotIcon } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import CenterBox from "@/components/center-box";

export default function Home() {
  const { user, logout } = useAuth();

  return (
    <p className="mt-4">
      Welcome {user?.email || user?.username}! [<a onClick={logout}>Logout</a>]
    </p>
  );
}
