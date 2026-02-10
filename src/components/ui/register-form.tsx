import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, type SyntheticEvent } from "react"
import { type FetchBaseQueryError } from "@reduxjs/toolkit/query/react"
import { useRegisterMutation } from "../../services/auth"

interface RegisterFormProps {
  onSuccess?: () => void
  onLoginClick: () => void
}

const inputClassName =
  "border-4 border-black rounded-none focus-visible:ring-0 focus-visible:border-primary placeholder:opacity-30"

export function RegisterForm({ onSuccess, onLoginClick }: RegisterFormProps) {
  const [register, { isLoading }] = useRegisterMutation()
  const [error, setError] = useState<string | null>(null)
  const [emailConflict, setEmailConflict] = useState(false)
  const [passwordError, setPasswordError] = useState(false)

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setEmailConflict(false)
    setPasswordError(false)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setPasswordError(true)
      return
    }

    try {
      await register({ email, password }).unwrap()
      onSuccess?.()
    } catch (err) {
      const fetchErr = err as FetchBaseQueryError
      if (fetchErr.status === 409) {
        setError("User already exists")
        setEmailConflict(true)
      } else if (fetchErr.status === 400) {
        const data = fetchErr.data as { errors?: Record<string, string> } | undefined
        if (data?.errors) {
          if ("Password" in data.errors) setPasswordError(true)
          if ("Email" in data.errors) setEmailConflict(true)
          const messages = Object.entries(data.errors)
            .map(([field, msg]) => `${field}: ${msg}`)
            .join("; ")
          setError(messages)
        } else {
          setError("Invalid request")
        }
      } else {
        setError("Registration failed")
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="reg-email" className="text-[10px] uppercase">
          Email
        </Label>
        <Input
          name="email"
          id="reg-email"
          type="email"
          required
          placeholder="HERO@EXAMPLE.COM"
          className={emailConflict ? inputClassName + " border-destructive" : inputClassName}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="reg-password" className="text-[10px] uppercase">
          Password
        </Label>
        <Input
          name="password"
          id="reg-password"
          type="password"
          required
          className={passwordError ? inputClassName + " border-destructive" : inputClassName}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="reg-confirm" className="text-[10px] uppercase">
          Confirm Password
        </Label>
        <Input
          name="confirmPassword"
          id="reg-confirm"
          type="password"
          required
          className={passwordError ? inputClassName + " border-destructive" : inputClassName}
        />
      </div>
      {error && (
        <p className="text-[10px] uppercase font-bold text-destructive">
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-12"
      >
        {isLoading ? "Creating..." : "Create Account"}
      </Button>
      <div className="text-center text-[8px] uppercase opacity-50">
        Already have an account?{" "}
        <span
          onClick={onLoginClick}
          className="text-primary cursor-pointer hover:underline"
        >
          Sign in
        </span>
      </div>
    </form>
  )
}
