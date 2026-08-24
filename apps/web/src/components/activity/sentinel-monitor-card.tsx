import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
} from "@atlas/ui/components/avatar";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@atlas/ui/components/card";
import { Firecrawl, Qwen } from "@atlas/ui/components/socials";

export const SentinelMonitorCard = () => (
  <Card size="sm">
    <CardHeader>
      <CardTitle>Travel Sentinel</CardTitle>
      <CardDescription>
        The Travel Sentinel agent scans destinations every 6 hours and posts new
        alerts here.
      </CardDescription>
      <CardAction>
        <AvatarGroup>
          <Avatar size="sm">
            <AvatarFallback>
              <Firecrawl className="size-3.5" />
            </AvatarFallback>
          </Avatar>
          <Avatar size="sm">
            <AvatarFallback>
              <Qwen className="size-3.5" />
            </AvatarFallback>
          </Avatar>
        </AvatarGroup>
      </CardAction>
    </CardHeader>
  </Card>
);
