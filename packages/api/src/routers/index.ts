import { router } from "../index";
import { bookingRouter } from "./booking";
import { healthRouter } from "./health";
import { tripsRouter } from "./trips";
import { userRouter } from "./user";

export const appRouter = router({
  booking: bookingRouter,
  health: healthRouter,
  trips: tripsRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
