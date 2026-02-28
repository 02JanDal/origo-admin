import { StyleSchemaService } from "@/services";
import { BaseController } from "./BaseController";
import { Request, Response } from "express";

class ExtendedStyleSchemaController extends BaseController<StyleSchemaService> {
  constructor(service: StyleSchemaService) {
    super(service);
  }
  async getByName(req: Request, res: Response): Promise<void> {
      const name = req.params.name;
      const items = await (this.service as any).getByName(name);
      res.status(200).json(items);
  }
}

const styleSchemaService = new StyleSchemaService();
const styleSchemaController = new ExtendedStyleSchemaController(
  styleSchemaService
);
export { styleSchemaController };
