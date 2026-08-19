"use client";

import { Button } from "@atlas/ui/components/button";
import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
} from "@atlas/ui/components/card";
import { GoogleCalendar, GoogleMaps } from "@atlas/ui/components/socials";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@atlas/ui/components/tooltip";
import { cn } from "@atlas/ui/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plug, Unplug } from "lucide-react";

import {
  connectIntegration,
  disconnectIntegration,
  getConnectedIntegrations,
} from "@/app/actions/composio";
import { useAssistantSidebarSync } from "@/hooks/use-assistant-panel";

const INTEGRATIONS = [
  {
    icon: GoogleCalendar,
    id: "googlecalendar",
    title: "Google Calendar",
  },
  {
    icon: GoogleMaps,
    id: "google_maps",
    title: "Google Maps",
  },
];

export default function IntegrationsPage() {
  const { isOpen } = useAssistantSidebarSync();
  const queryClient = useQueryClient();

  const { data: connectedIntegrations = [] } = useQuery({
    queryFn: () => getConnectedIntegrations(),
    queryKey: ["connectedIntegrations"],
  });

  return (
    <div className="container py-6 mx-auto">
      <div
        className={cn(
          "grid grid-cols-1 gap-6 md:grid-cols-2 transition-all duration-300 ease-in-out",
          isOpen ? "lg:grid-cols-2" : "lg:grid-cols-4"
        )}
      >
        {INTEGRATIONS.map((integration) => {
          const isConnected = connectedIntegrations.includes(integration.id);

          return (
            <Card key={integration.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <integration.icon className="size-6" />
                  <div className="flex flex-col">
                    <CardTitle>{integration.title}</CardTitle>
                  </div>
                </div>
                <CardAction>
                  {isConnected ? (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            size="icon-sm"
                            variant="destructive"
                            onClick={async () => {
                              await disconnectIntegration(integration.id);
                              await queryClient.invalidateQueries({
                                queryKey: ["connectedIntegrations"],
                              });
                            }}
                          >
                            <Unplug />
                          </Button>
                        }
                      />
                      <TooltipContent>Disconnect</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            size="icon-sm"
                            variant="outline"
                            onClick={() => connectIntegration(integration.id)}
                          >
                            <Plug />
                          </Button>
                        }
                      />
                      <TooltipContent>Connect</TooltipContent>
                    </Tooltip>
                  )}
                </CardAction>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
