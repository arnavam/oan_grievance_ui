export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="w-full h-screen overflow-y-auto flex flex-col">{children}</div>;
}
