import { TokenUtils } from "@/utils/accessTokenUtils";
import { Request, Response, NextFunction } from "express";
import { MapInstanceService } from "@/services";

const mapInstanceService = new MapInstanceService();

const isLatestPublishedRoute = (requiredPermission: string): boolean =>
  requiredPermission.includes("/:name/published/latest{.json}") && requiredPermission.includes("/mapinstances");

const canAccessPublishedMapWithoutAuth = async (req: Request, requiredPermission: string): Promise<boolean> => {
  if (!isLatestPublishedRoute(requiredPermission)) {
    return false;
  }

  const mapName = req.params.name;
  if (!mapName) {
    return false;
  }

  const resolvedMapName = Array.isArray(mapName) ? mapName[0] : mapName;
  if (!resolvedMapName) {
    return false;
  }

  return mapInstanceService.isPublic(resolvedMapName);
};

export const checkPermission = (requiredPermission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authorizationHeader = req.headers["authorization"];
    const token = Array.isArray(authorizationHeader)
      ? authorizationHeader[0]?.split(" ")[1]
      : authorizationHeader?.split(" ")[1];

    if (!token) {
      if (await canAccessPublishedMapWithoutAuth(req, requiredPermission)) {
        return next();
      }
      return res.status(401).json({ error: "No token provided" });
    }

    const decodedToken = TokenUtils.verifyAndDecodeAccessToken(token);
    if (!decodedToken) {
      return res.status(401).json({ error: "Invalid token" });
    }

    if (decodedToken.permissions.includes("*")) {
      return next();
    }

    if (decodedToken.permissions.includes(requiredPermission)) {
      return next();
    }

    // Check for wildcard permissions
    const [method, path] = requiredPermission.split(":");
    const wildcardPermissions = [
      `${method}:*`,
      `*:${path}`,
      `*:/${path.split("/")[1]}/*`, // Allows access to all sub-routes
    ];

    for (const wildcardPerm of wildcardPermissions) {
      if (decodedToken.permissions.includes(wildcardPerm)) {
        return next();
      }
    }

    res.status(403).json({ error: "Insufficient permissions" });
  };
};
