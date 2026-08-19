import { publicProcedure, router } from "../index";

export const healthRouter = router({
  check: publicProcedure.query(() => "OK"),
});
