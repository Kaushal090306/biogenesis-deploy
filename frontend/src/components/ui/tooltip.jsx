import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

function TooltipProvider({ delayDuration = 0, ...props }) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip({ ...props }) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  )
}

function TooltipTrigger({ ...props }) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

const variantClasses = {
  light:
    'border border-white/[0.12] bg-surface-700 text-slate-200 shadow-md shadow-black/20',
  dark:
    'bg-zinc-950 text-white shadow-md shadow-black/30',
}

function TooltipContent({ className, sideOffset = 4, variant = 'dark', ...props }) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          'z-50 overflow-hidden rounded-md px-3 py-1.5 text-xs',
          'animate-in fade-in-0 zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'data-[side=bottom]:slide-in-from-top-2',
          'data-[side=left]:slide-in-from-right-2',
          'data-[side=right]:slide-in-from-left-2',
          'data-[side=top]:slide-in-from-bottom-2',
          variantClasses[variant] ?? variantClasses.dark,
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
