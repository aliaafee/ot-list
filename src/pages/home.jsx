import { Link } from "react-router";
import { BotIcon } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import CenterBox from "@/components/center-box";

export default function Home() {
  const { logout } = useAuth();

  return (
    <CenterBox>
      <BotIcon width={64} height={64} />
      <div className="mt-4">Hello Vite+React+Tailwind4+PocketBase</div>
      <div className="mt-4 flex gap-4">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/register">Add User</Link>
        <a onClick={logout}>Logout</a>
      </div>
    </CenterBox>
  );
}
