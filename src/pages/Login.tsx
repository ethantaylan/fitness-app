import { SignIn } from "@clerk/react";

export default function Login() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <SignIn path="/sign-in" routing="path" forceRedirectUrl="/dashboard" signUpUrl="/sign-up" />
    </div>
  );
}
