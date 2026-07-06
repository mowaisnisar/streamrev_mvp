import { redirect } from "next/navigation";

export default function Home() {
  // The dashboard is the app's home; middleware redirects unauthenticated users to /signin.
  redirect("/dashboard");
}
