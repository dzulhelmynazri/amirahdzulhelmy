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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plug, Unplug } from "lucide-react";
import { toast } from "sonner";

import { useAgentSidebarSync } from "@/hooks/use-agent-panel";
import { trpc } from "@/utils/trpc";

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
] as const;

export default function IntegrationsPage() {
  const { isOpen } = useAgentSidebarSync();
  const queryClient = useQueryClient();

  const { data: connectedIntegrations = [] } = useQuery(
    trpc.integration.connected.queryOptions()
  );

  const connect = useMutation(
    trpc.integration.connect.mutationOptions({
      onError: (error) => {
        toast.error(error.message);
      },
      onSuccess: ({ redirectUrl }) => {
        window.location.assign(redirectUrl);
      },
    })
  );

  const disconnect = useMutation(
    trpc.integration.disconnect.mutationOptions({
      onError: (error) => {
        toast.error(error.message);
      },
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.integration.connected.queryFilter()
        );
      },
    })
  );

  return (
    <div className="container mx-auto py-6">
      <div
        className={cn(
          "grid grid-cols-1 gap-6 transition-all duration-300 ease-in-out md:grid-cols-2",
          isOpen ? "lg:grid-cols-2" : "lg:grid-cols-4"
        )}
      >
        {INTEGRATIONS.map((integration) => {
          const isConnected = connectedIntegrations.includes(integration.id);
          const isConnecting =
            connect.isPending &&
            connect.variables?.toolkitSlug === integration.id;
          const isDisconnecting =
            disconnect.isPending &&
            disconnect.variables?.toolkitSlug === integration.id;

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
                            disabled={isDisconnecting}
                            onClick={() =>
                              disconnect.mutate({
                                toolkitSlug: integration.id,
                              })
                            }
                            size="icon-sm"
                            variant="destructive"
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
                            disabled={isConnecting}
                            onClick={() =>
                              connect.mutate({ toolkitSlug: integration.id })
                            }
                            size="icon-sm"
                            variant="outline"
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
