import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "@/contexts/auth-context";
import CenterBox from "@/components/center-box";

function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (e) {
      setErr(e?.message || "Login failed");
    }
  }

  return (
    <CenterBox>
      <h1 className="font-bold">Login</h1>
      {import.meta.env.VITE_PB_BASE_URL}
      <form
        onSubmit={onSubmit}
        className="grid grid-cols-1 mt-4 justify-items-center"
      >
        <label>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          className="bg-white text-black rounded-lg px-3 py-1"
        />

        <label className="mt-2">Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          className="bg-white text-black rounded-lg px-3 py-1"
        />

        {err && <p className="mt-4 text-red-500">{err}</p>}
        <button
          type="submit"
          className="mt-4 px-4 py-1 bg-gray-600 hover:bg-gray-500 rounded-lg"
        >
          Sign in
        </button>
      </form>
    </CenterBox>
  );
}

export default Login;
