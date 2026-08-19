import { router } from "../index";
import { bookingRouter } from "./booking";
import { healthRouter } from "./health";
import { userRouter } from "./user";

export const appRouter = router({
  booking: bookingRouter,
  health: healthRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
