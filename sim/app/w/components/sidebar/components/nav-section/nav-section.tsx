'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface NavSectionProps {
  children: ReactNode
  isLoading?: boolean
  itemCount?: number
  isCollapsed?: boolean
}

interface NavItemProps {
  icon: ReactNode
  label: string
  href?: string
  active?: boolean
  onClick?: () => void
  isCollapsed?: boolean
}

export function NavSection({
  children,
  isLoading = false,
  itemCount = 3,
  isCollapsed,
}: NavSectionProps) {
  if (isLoading) {
    return (
      <nav className="space-y-[1px]">
        {Array(itemCount)
          .fill(0)
          .map((_, i) => (
            <NavItemSkeleton key={i} isCollapsed={isCollapsed} />
          ))}
      </nav>
    )
  }

  return <nav className="space-y-[1px]">{children}</nav>
}

function NavItem({ icon, label, href, active, onClick, isCollapsed }: NavItemProps) {
  const className = clsx(
    'flex items-center gap-2 rounded-md px-2 py-[6px] text-sm font-medium text-muted-foreground',
    {
      'bg-accent': active,
      'hover:bg-accent/50': !active,
      'cursor-pointer': onClick,
      'justify-center': isCollapsed,
      'w-full': !isCollapsed,
      'w-8 mx-auto': isCollapsed,
    }
  )

  const content = (
    <>
      {isCollapsed ? <div className="p-[1px]">{icon}</div> : icon}
      {!isCollapsed && <span className="truncate">{label}</span>}
    </>
  )

  if (isCollapsed) {
    if (href) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={href} className={className}>
              {content}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      )
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={onClick} className={className}>
            {content}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    )
  }

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <button onClick={onClick} className={className}>
      {content}
    </button>
  )
}

function NavItemSkeleton({ isCollapsed }: { isCollapsed?: boolean }) {
  if (isCollapsed) {
    return (
      <div className="w-8 h-8 mx-auto flex items-center justify-center">
        <Skeleton className="h-[18px] w-[18px]" />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-[6px]">
      <Skeleton className="h-[18px] w-[18px]" />
      <Skeleton className="h-4 w-24" />
    </div>
  )
}

NavSection.Item = NavItem
NavSection.Skeleton = NavItemSkeleton
