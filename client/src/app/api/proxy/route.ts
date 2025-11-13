import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { ActorDto } from "@/shared/interfaces/dtos";
import { userInfoService } from "@/lib/auth/userInforService";

const API_ACCESS_TOKEN = process.env.PROTECTED_API_ACCESS_TOKEN;
const ADMIN_ROLE = process.env.PROTECTED_ADMIN_ROLE;
const AUTH_ENABLED = process.env.AUTH_ENABLED === "true";
const ROLE_ROUTE = "permissions/roles/name/";
const BASE_URL = process.env.BASE_URL;

async function handler(req: NextRequest) {
  const { method } = req;
  const url = req.nextUrl.searchParams.get("url");
  const jwtPayload = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!url || Array.isArray(url)) {
    return NextResponse.json({ error: "Missing or invalid url query parameter" }, { status: 400 });
  }
  const headers: Record<string, string> = {};

  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  if (API_ACCESS_TOKEN) {
    headers["Authorization"] = `Bearer ${API_ACCESS_TOKEN}`;
  }

  if (AUTH_ENABLED && ADMIN_ROLE) {
    if (!jwtPayload || (jwtPayload.access_token === null && jwtPayload.access_token !== undefined)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const userInfo = await userInfoService.getUserInfo(jwtPayload.access_token as string, jwtPayload.accessTokenExpires as number);
      const userGroups = userInfo.claims.split(",").map((dn: string) => dn.trim());
      const roleInfo = await getRoleInfo(ADMIN_ROLE!);

      headers["X-User-Info"] = JSON.stringify(userInfo.username);

      if (!roleInfo || !roleInfo.actors || roleInfo.actors.length === 0) {
        console.warn(`[${new Date().toISOString()}] Warning: Empty role info, granting access, make sure to add the ADMIN Role to permissions!`);
      } else {
        const hasAccess = roleInfo.actors.some(
          (actor: ActorDto) => (actor.type === "Group" && userGroups.includes(actor.name)) || (actor.type === "User" && actor.name === userInfo.username)
        );

        if (!hasAccess) {
          console.error(`[${new Date().toISOString()}] Error in authentication process: User not authorized`);
          return NextResponse.redirect(new URL(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/auth/signin`, req.url));
        }
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in authentication process: User not authorized`);
      return NextResponse.redirect(new URL(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/auth/signin`, req.url));
    }
  }

  try {
    let response: Response;

    if (method === "GET" || method === "DELETE") {
      response = await fetch(url, {
        method,
        headers,
      });
    } else if (method === "POST" || method === "PUT") {
      if (!req.body) {
        return NextResponse.json({ error: "Missing request body" }, { status: 400 });
      }

      const bodyBuffer = await req.arrayBuffer();
      headers["content-length"] = bodyBuffer.byteLength.toString();

      response = await fetch(url, {
        method,
        headers,
        body: bodyBuffer,
      });
    } else {
      return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
    }

    if (
      (response.status === 204 && response.headers.get("Content-Length") === "0") ||
      response.headers.get("Content-Length") === null ||
      (response.status === 200 && response.statusText === "No Content")
    ) {
      return new NextResponse(null, { status: response.status });
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } else {
      const text = await response.text();
      return new NextResponse(text, { status: response.status });
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Proxy error: ${error}`);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

async function getRoleInfo(roleName: string) {
  const roleUrl = `${BASE_URL}${ROLE_ROUTE}${roleName}`;
  const response = await fetch(roleUrl, {
    headers: {
      Authorization: `Bearer ${API_ACCESS_TOKEN}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Failed to fetch role info: ${response.statusText}`);
  }

  return await response.json();
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
