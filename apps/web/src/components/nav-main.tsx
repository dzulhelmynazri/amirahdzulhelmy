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

const data = {
  navMain: [
    {
      icon: <SquareActivity />,
      title: "Activity",
      url: "/activity",
    },

    {
      icon: <TicketsPlane />,
      title: "Fares",
      url: "/fares",
    },
    {
      icon: <Calendar />,
      title: "Bookings",
      url: "/bookings",
    },
    {
      icon: <Plane />,
      title: "Trips",
      url: "/trips",
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
