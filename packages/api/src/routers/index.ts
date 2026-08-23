import { router } from "../index";
import { bookingRouter } from "./booking";
import { fareRouter } from "./fare";
import { healthRouter } from "./health";
import { integrationRouter } from "./integration";
import { tripsRouter } from "./trips";
import { userRouter } from "./user";

export const appRouter = router({
  booking: bookingRouter,
  fare: fareRouter,
  health: healthRouter,
  integration: integrationRouter,
  trips: tripsRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
