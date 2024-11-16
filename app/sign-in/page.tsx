import { SignInForm } from "@/components/auth/sign-in-form"

export default function SignInPage() {
  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-[400px] mx-4">
        <SignInForm />
      </div>
    </div>
  )
} 