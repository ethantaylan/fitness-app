import { SignUp } from "@clerk/react";

export default function Register() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <SignUp path="/sign-up" routing="path" forceRedirectUrl="/dashboard" signInUrl="/sign-in" />
    </div>
  );
}
