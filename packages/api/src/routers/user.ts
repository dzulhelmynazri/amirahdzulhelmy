import { protectedProcedure, router } from "../index";

export const userRouter = router({
  getPrivateData: protectedProcedure.query(({ ctx }) => ({
    message: "This is private",
    user: ctx.session.user,
  })),
});
