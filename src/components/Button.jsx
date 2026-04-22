import React from "react";
import { cn } from "@/lib/utils";

const Button = React.forwardRef(({ 
  className, 
  variant = "primary", 
  size = "md", 
  active = false,
  ...props 
}, ref) => {
  const variants = {
    primary: "bg-black text-white hover:bg-black/90",
    secondary: "bg-secondary text-foreground hover:bg-secondary/80",
    outline: "bg-transparent border border-border hover:bg-secondary",
    ghost: "bg-transparent hover:bg-secondary/50",
    clay: "bg-white clay-card text-black hover:bg-white/90",
    lemon: "bg-lemon-500 text-black clay-card hover:bg-lemon-400",
    architect: "architect-button",
    "architect-primary": "architect-button-primary",
  };

  const sizes = {
    sm: "h-9 px-3 text-[10px] uppercase tracking-wider rounded-sm",
    md: "h-11 px-6 text-[12px] font-bold uppercase tracking-widest rounded-sm",
    lg: "h-14 px-8 text-sm font-bold uppercase tracking-widest rounded-sm",
    icon: "h-11 w-11 p-0 rounded-sm flex items-center justify-center",
    "icon-lg": "h-14 w-14 p-0 rounded-sm flex items-center justify-center",
  };

  return (
    <button
      ref={ref}
      className={cn(
        "clay-button inline-flex items-center justify-center font-bold tracking-tight select-none",
        variants[variant],
        sizes[size],
        active && "scale-95",
        className
      )}
      {...props}
    />
  );
});

Button.displayName = "Button";

export { Button };
