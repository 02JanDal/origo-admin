import { createLayerService } from "@/utils/layerServiceFactory";
import { Request, Response } from "express";
import { ValidationService } from "@/services/validation.service";

class LayerController {
  private validationService: ValidationService;

  constructor() {
    this.validationService = new ValidationService();
  }

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
    const type = req.params.type as string;
    const layers = req.body;
    const shouldValidate = req.query.skipValidation !== 'true';

    // Validate by default (unless explicitly skipped)
    if (shouldValidate) {
      // If layers is an array, validate each one
      const layersArray = Array.isArray(layers) ? layers : [layers];

      for (const layer of layersArray) {
        const result = await this.validationService.validateLayerData(type, layer);
        if (!result.valid) {
          return res.status(400).json({
            error: 'Validation failed',
            validationErrors: result.errors
          });
        }
      }
    }

    // Create layers if validation passed or was skipped
    const service = createLayerService(type);
    const item = await service.create(layers);
    res.status(201).json(item);
  }

  async update(req: Request, res: Response) {
    const type = req.params.type as string;
    const layer = req.body;
    const shouldValidate = req.query.skipValidation !== 'true';

    // Validate by default (unless explicitly skipped)
    if (shouldValidate) {
      const result = await this.validationService.validateLayerData(type, layer);
      if (!result.valid) {
        return res.status(400).json({
          error: 'Validation failed',
          validationErrors: result.errors
        });
      }
    }

    // Update layer if validation passed or was skipped
    const service = createLayerService(type);
    const item = await service.update(req.params.id as string, layer);
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
