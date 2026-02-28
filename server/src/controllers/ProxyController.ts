import { ProxyService } from "@/services";
import { Request, Response } from "express";

class ProxyController {
  private service;
  constructor() {
    this.service = new ProxyService();
  }

  async getAllResources(req: Request, res: Response) {
      const items = await this.service.getAllResources();
      res.status(200).json(items);
  }
  async getAllRoles(req: Request, res: Response) {
      const items = await this.service.getAllRoles();
      res.status(200).json(items);
  }
}

const proxyController = new ProxyController();
export { proxyController };
