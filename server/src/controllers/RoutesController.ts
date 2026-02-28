import { RouteRegistry } from "@/utils/routeUtils";
import { Request, Response } from "express";

class RoutesController {
  public getAvailableRoutes(req: Request, res: Response) {
      const routes = RouteRegistry.getAvailableRoutes();
      res.status(200).json(routes);
  }
}

const routesController = new RoutesController();
export { routesController };
