import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "@/contexts/auth-context";
import CenterBox from "@/components/center-box";

export default function Register() {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await register({ email, password, passwordConfirm });
      navigate("/", { replace: true });
    } catch (e) {
      setErr(e?.message || "Registration failed");
    }
  }

  return (
    <CenterBox>
      <div className="flex gap-4 text-left w-full">
        <Link to="/">{"<"} Back</Link>
      </div>
      <h1 className="font-bold">Register</h1>

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
          className="bg-white text-black rounded-lg px-4 py-1"
        />

        <label className="mt-2">Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          className="bg-white text-black rounded-lg px-4 py-1"
        />

        <label className="mt-2">Confirm Password</label>
        <input
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          type="password"
          required
          className="bg-white text-black rounded-lg px-4 py-1"
        />

        {err && <p className="mt-4 text-red-500">{err}</p>}
        <button
          type="submit"
          className="mt-4 px-4 py-1 bg-gray-600 hover:bg-gray-500 rounded-lg"
        >
          Create account
        </button>
      </form>
    </CenterBox>
  );
}
