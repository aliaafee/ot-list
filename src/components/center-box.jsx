export default function CenterBox({ children }) {
  return (
    <div className="overflow-hidden w-screen h-screen flex bg-linear-30 from-sky-200 via-blue-400 to-indigo-900 to-90%">
      <div className="m-auto rounded-2xl bg-black/50 p-4 w-80 text-center grid grid-cols-1 justify-items-center text-white">
        {children}
      </div>
    </div>
  );
}
