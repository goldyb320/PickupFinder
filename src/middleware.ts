import { auth } from "@/lib/auth";

export default auth((req) => {
  const isAuth = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith("/auth");

  if (isAuthPage && isAuth) {
    return Response.redirect(new URL("/", req.url));
  }

  return undefined;
});

export const config = {
  matcher: ["/auth/signin"],
};
