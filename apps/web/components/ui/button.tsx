import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "danger";
};

export function Button({ className = "", variant = "default", ...props }: ButtonProps) {
  const variantClass = variant === "default" ? "" : variant;
  return <button className={["button", variantClass, className].filter(Boolean).join(" ")} {...props} />;
}
