import { Request, Response } from "express";

class BaseController<T> {
  protected service: {
    find: (id: string) => Promise<T>;
    findAll: () => Promise<T[]>;
    create: (data: T) => Promise<T>;
    update: (id: string, data: T) => Promise<T>;
    delete: (id: string) => Promise<T>;
  };

  constructor(service: any) {
    this.service = service;
  }

  async getById(req: Request, res: Response) {
      const item = await this.service.find(req.params.id as string);
      res.status(200).json(item);
  }

  async getAll(req: Request, res: Response) {
      const items = await this.service.findAll();
      res.status(200).json(items);
  }

  async create(req: Request, res: Response) {
      const item = await this.service.create(req.body);
      res.status(201).json(item);
  }

  async update(req: Request, res: Response) {
      const item = await this.service.update(req.params.id as string, req.body);
      res.status(200).json(item);
  }

  async deleteById(req: Request, res: Response) {
      await this.service.delete(req.params.id as string);
      res.status(204).end();
  }
}

export { BaseController };
