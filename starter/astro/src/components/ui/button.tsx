import * as React from 'react'
import { Slot } from 'radix-ui'

import { buttonVariants, type ButtonVariantProps } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  ButtonVariantProps & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button }
