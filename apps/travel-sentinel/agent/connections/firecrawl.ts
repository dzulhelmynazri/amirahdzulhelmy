import { defineMcpClientConnection } from "eve/connections";

export default defineMcpClientConnection({
  auth: {
    getToken: () => {
      const apiKey = process.env.FIRECRAWL_API_KEY as string;

      return Promise.resolve({ token: apiKey });
    },
  },
  description:
    "Firecrawl: search the web, scrape pages, crawl sites, and extract structured data for travel intelligence — news, safety alerts, weather events, transit disruptions, and destination advisories.",
  url: "https://mcp.firecrawl.dev/v2/mcp",
});
