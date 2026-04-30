import React from "react";
import { cn } from "@/lib/utils";

/**
 * Button — wraps mc-btn-primary and mc-pill tokens.
 *
 * variant:
 *   "primary"  — mc-btn-primary (filled orange, pill shape)
 *   "pill"     — mc-pill with explicit bg/color via style prop
 *   "ghost"    — transparent, text color only
 *
 * size:
 *   "sm"  — compact (h-9)
 *   "md"  — default (h-[54px])
 *   "lg"  — large (h-14)
 *   "xl"  — hero (h-16 w-20 rounded-full, for timer play/pause)
 *
 * Usage:
 *   <Button>Save changes</Button>
 *   <Button variant="ghost" onClick={...}>Discard</Button>
 *   <Button variant="pill" style={{ background: "oklch(var(--text))", color: "oklch(var(--canvas))" }}>
 *     Start Session
 *   </Button>
 */
const SIZE = {
  sm:  "px-5 py-2 text-[10px]",
  md:  "px-8 h-[54px] text-sm",
  lg:  "px-8 h-14 text-base",
  xl:  "w-20 h-20 rounded-full",
};

const Button = React.forwardRef(({ variant = "primary", size = "md", className, style, children, ...props }, ref) => {
  if (variant === "primary") {
    return (
      <button ref={ref} className={cn("mc-btn-primary", SIZE[size], className)} style={style} {...props}>
        {children}
      </button>
    );
  }
  if (variant === "pill") {
    return (
      <button ref={ref} className={cn("mc-pill", SIZE[size], className)} style={style} {...props}>
        {children}
      </button>
    );
  }
  // ghost
  return (
    <button
      ref={ref}
      className={cn("mc-body font-bold uppercase tracking-widest transition-opacity hover:opacity-50", SIZE[size], className)}
      style={{ color: "oklch(var(--text-muted))", ...style }}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";

export { Button };
export default Button;
