"use client";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@atlas/ui/components/sidebar";
import {
  SquareActivity,
  Calendar,
  Plane,
  TicketsPlane,
  ToyBrick,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Ordered by the traveller's journey: find a fare, book it, plan the trip,
 * watch for trouble, then the plumbing. Icons follow the noun — tickets for
 * bookings, a calendar for trips — not the other way round.
 */
const data = {
  navMain: [
    {
      icon: <Plane />,
      title: "Fares",
      url: "/fares",
    },
    {
      icon: <TicketsPlane />,
      title: "Bookings",
      url: "/bookings",
    },
    {
      icon: <Calendar />,
      title: "Trips",
      url: "/trips",
    },
    {
      icon: <SquareActivity />,
      title: "Activity",
      url: "/activity",
    },
    {
      icon: <ToyBrick />,
      title: "Integrations",
      url: "/integrations",
    },
  ],
};

export const NavMain = () => {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Flight Guardians</SidebarGroupLabel>
      <SidebarMenu>
        {data.navMain.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              tooltip={item.title}
              isActive={pathname.startsWith(item.url)}
              render={
                <Link href={item.url}>
                  {item.icon}
                  <span>{item.title}</span>
                </Link>
              }
            />
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
};
