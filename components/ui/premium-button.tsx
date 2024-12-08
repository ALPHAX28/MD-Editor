import { Button, ButtonProps } from "./button"

export function PremiumButton(props: ButtonProps) {
  return (
    <Button
      {...props}
      variant="default"
      className={`bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white ${props.className}`}
    />
  )
} 