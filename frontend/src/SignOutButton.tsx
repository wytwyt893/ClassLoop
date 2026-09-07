import { useAuthActions, useConvexAuth } from "./services/dataProvider";

export function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  if (!isAuthenticated) return null;
  return <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700" onClick={() => void signOut()}>退出</button>;
}
