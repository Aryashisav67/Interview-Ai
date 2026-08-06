import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-display text-xs font-semibold uppercase tracking-[0.12em] transition-all disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 rounded-sm border",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border-primary hover:bg-primary/90",
        destructive: "bg-destructive text-foreground border-destructive hover:bg-destructive/90",
        outline: "bg-transparent text-foreground border-border hover:border-foreground/40",
        secondary: "bg-secondary text-secondary-foreground border-border hover:bg-secondary/70",
        ghost: "border-transparent hover:bg-secondary/60",
        link: "border-transparent text-primary underline-offset-4 hover:underline normal-case tracking-normal",
      },
      size: {
        default: "h-10 px-4 has-[>svg]:px-3",
        sm: "h-8 px-3 text-[0.65rem] has-[>svg]:px-2.5",
        lg: "h-12 px-6 has-[>svg]:px-5",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
