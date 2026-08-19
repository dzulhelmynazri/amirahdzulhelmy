import { localDev, vercelOidc } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";

import { betterAuth, trustAtlasAgentForwarder } from "../lib/auth";

export default eveChannel({
  auth: [betterAuth, vercelOidc(), localDev()],
  cors: true,
  trustedForwarders: trustAtlasAgentForwarder,
});
