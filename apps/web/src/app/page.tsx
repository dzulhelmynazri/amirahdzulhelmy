import { redirect } from "next/navigation";

/**
 * The root used to render a scaffold "API Status: Connected" card — a dev
 * health check posing as a homepage. The product starts where the journey
 * starts: finding a fare. (The health endpoint itself still exists for
 * anything that genuinely wants to probe it.)
 */
const Home = () => redirect("/fares");

export default Home;
