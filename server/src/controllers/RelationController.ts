import { Request, Response } from "express";
import { RelationService } from "@/services";

class RelationController {
  private service;
  constructor() {
    this.service = new RelationService();
  }

  async getRelated(req: Request, res: Response) {
      const items = await this.service.findRelated(req.params.in as string, req.params.id as string, req.params.path as string);
      res.status(200).json(items);
  }
}

const relationController = new RelationController();
export { relationController as RelationController };
