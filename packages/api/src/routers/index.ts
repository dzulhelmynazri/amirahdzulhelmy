import { router } from "../index";
import { activityRouter } from "./activity";
import { bookingRouter } from "./booking";
import { fareRouter } from "./fare";
import { healthRouter } from "./health";
import { integrationRouter } from "./integration";
import { newsRouter } from "./news";
import { tripsRouter } from "./trips";
import { userRouter } from "./user";

export const appRouter = router({
  activity: activityRouter,
  booking: bookingRouter,
  fare: fareRouter,
  health: healthRouter,
  integration: integrationRouter,
  news: newsRouter,
  trips: tripsRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
