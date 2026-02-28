import { createLayerService } from "@/utils/layerServiceFactory";
import { Request, Response } from "express";

class LayerController {
  async getById(req: Request, res: Response) {
      const service = createLayerService(req.params.type as string);
      const item = await service.find(req.params.id as string);
      res.status(200).json(item);
  }

  async getByName(req: Request, res: Response) {
      const service = createLayerService("all");
      const items = await service.getByName(req.params.name as string);
      res.status(200).json(items);
  }

  async getAll(req: Request, res: Response) {
      const service = createLayerService(req.params.type as string);
      const items = await service.findAll();
      res.status(200).json(items);
  }

  async create(req: Request, res: Response) {
      const service = createLayerService(req.params.type as string);
      const item = await service.create(req.body);
      res.status(201).json(item);
  }

  async update(req: Request, res: Response) {
      const service = createLayerService(req.params.type as string);
      const item = await service.update(req.params.id as string, req.body);
      res.status(200).json(item);
  }

  async duplicate(req: Request, res: Response) {
      const service = createLayerService(req.params.type as string);
      const item = await service.duplicate(req.params.id as string);
      res.status(201).json(item);
  }

  async deleteById(req: Request, res: Response) {
      const service = createLayerService(req.params.type as string);
      const item = await service.delete(req.params.id as string);
      res.status(200).json(item);
  }
}

const layerController = new LayerController();
export { layerController };
