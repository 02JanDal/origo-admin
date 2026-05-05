import { BaseController } from "./BaseController";
import { MapInstanceService } from "../services";
import { Request, Response } from "express";
import { PublishedMapDto } from "@/shared/interfaces/dtos";

class ExtendedMapInstanceController extends BaseController<MapInstanceService> {
  constructor(service: MapInstanceService) {
    super(service);
  }

  async getPreview(req: Request, res: Response): Promise<void> {
      const id = req.params.id;
      const preview = await (this.service as any).getPreview(id);
      res.json(preview);
  }

  async getLatestPublished(req: Request, res: Response): Promise<void> {
      const name = req.params.name;
      const published = await (this.service as any).getLatestPublished(name);
      if (!published) {
          res.status(404).json({ message: "Not found" });
      } else {
          res.json(published);
      }
  }

  async getPublished(req: Request, res: Response): Promise<void> {
      const id = req.params.id;
      const published = await (this.service as any).getPublished(id);
      res.json(published);
  }

  async getPublishedList(req: Request, res: Response): Promise<void> {
      const id = req.params.id;
      const list = await (this.service as any).getPublishedList(id);
      res.json(list);
  }

  async publish(req: Request, res: Response): Promise<void> {
      const id = req.params.id;
      const comment: string = req.body.comment;
      const publishedMap = (await (this.service as any).publish(id, comment)) as PublishedMapDto;
      res.json(publishedMap);
  }

  async republish(req: Request, res: Response): Promise<void> {
      const id = req.params.id;
      const instanceId = req.params.instanceId;
      const publishedMap = (await (this.service as any).republish(id, instanceId)) as PublishedMapDto;
      res.json(publishedMap);
  }

  async syncLayer(req: Request, res: Response): Promise<void> {
      const layerId = req.params.id;
      const instanceIds = req.body.mapInstances;
      const actions = req.body.actions;
      const type = req.params.type;
      await (this.service as any).syncLayer(instanceIds, type, layerId, actions);
      res.json({ success: true });
  }
}

const mapInstanceService = new MapInstanceService();
const mapInstanceController = new ExtendedMapInstanceController(mapInstanceService);

export { mapInstanceController };
