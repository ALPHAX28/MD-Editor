import { SignUpForm } from "@/components/auth/sign-up-form"

export default function SignUpPage() {
  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-[400px] mx-4">
        <SignUpForm />
      </div>
    </div>
  )
} 