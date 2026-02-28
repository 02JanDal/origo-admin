import { DBLinkResource, DBMapInstance, LinkResourceModel, MapInstanceModel } from "@/models";
import "@/mappers/";
import { Repository } from "@/repositories/Repository";
import {
  LinkResourceDto,
  MapInstanceDto,
  MapInstanceListItemDto,
  PublishedMapConfigDto,
  PublishedMapListItemDto
} from "@/shared/interfaces/dtos";
import { DBPublishedMap, PublishedMapModel } from "@/models/publishedMap.model";
import mongoose from "mongoose";
import { createLayerService } from "@/utils/layerServiceFactory";
import { IMapper } from "@/interfaces";
import {
  InstanceToPublishedMapMapper,
  PreviewMapMapper,
  publishedMapListItemMapper,
  publishedMapMapper
} from "@/mappers/publishedMapMapper";
import { instanceListItemMapper, instanceMapper } from "@/mappers/InstanceMapper";
import { linkResourceMapper } from "@/mappers/";

class MapInstanceService {
  private repository: Repository<DBMapInstance>;
  private publishedRepository: Repository<DBPublishedMap>;
  private linkResourceRepository: Repository<DBLinkResource>;

  private listItemMapper: IMapper<DBMapInstance, MapInstanceListItemDto>;
  private instanceMapper: IMapper<DBMapInstance, MapInstanceDto>;
  private instanceToPublishedMapMapper: IMapper<DBPublishedMap, DBMapInstance>;
  private previewMapMapper: IMapper<DBMapInstance, PublishedMapConfigDto>;
  private _linkResourceMapper: IMapper<DBLinkResource, LinkResourceDto>;

  private publishedMapMapper: IMapper<DBPublishedMap, PublishedMapConfigDto>;
  private publishedMapListItemMapper: IMapper<DBPublishedMap, PublishedMapListItemDto>;

  constructor() {
    this.repository = new Repository<DBMapInstance>(MapInstanceModel);
    this.publishedRepository = new Repository<DBPublishedMap>(PublishedMapModel);
    this.linkResourceRepository = new Repository<DBLinkResource>(LinkResourceModel);
    this.listItemMapper = new instanceListItemMapper();
    this.instanceMapper = new instanceMapper();
    this._linkResourceMapper = new linkResourceMapper();
    this.previewMapMapper = new PreviewMapMapper();
    this.instanceToPublishedMapMapper = new InstanceToPublishedMapMapper();
    this.publishedMapMapper = new publishedMapMapper();
    this.publishedMapListItemMapper = new publishedMapListItemMapper();
  }
  async find(id: string): Promise<MapInstanceDto> {
    let response = await this.repository.find(id);
    return this.instanceMapper.toDto(response);
  }
  async findAll(): Promise<MapInstanceListItemDto[]> {
    let response = await this.repository.findAll();
    let allPublished = await this.publishedRepository.findAll();
    const publishedIds = new Set(allPublished.map((p) => p.mapInstanceId.toString()));
    return response.map((item) => ({
      ...this.listItemMapper.toDto(item),
      isPublished: publishedIds.has(item._id.toString()),
      publishedUrl: publishedIds.has(item._id.toString())
        ? `${process.env.MAPINSTANCE_ROUTE_PATH}/${item.name}/published/latest`
        : "",
    }));
  }

  async getPreview(id: string): Promise<PublishedMapConfigDto> {
    let response;
    if (mongoose.Types.ObjectId.isValid(id)) {
      response = await this.repository.find(id);
    } else {
      response = (await this.repository.findByCriteria({ name: id }))[0];
    }
    let dbSources = await this.linkResourceRepository.findAll();
    let sources = dbSources.map((item) => this._linkResourceMapper.toDto(item));

    return this.previewMapMapper.toDto(response, sources);
  }

  async publish(id: string, comment: string): Promise<PublishedMapListItemDto> {
    let mapInstance = await this.repository.find(id);
    if (!mapInstance) throw new Error("Map instance not found");

    let dbSources = await this.linkResourceRepository.findAll();
    let sources = dbSources.map((item) => this._linkResourceMapper.toDto(item));
    let publishedMap = this.instanceToPublishedMapMapper.toDBModel(mapInstance, comment, sources);

    let response = await this.publishedRepository.create(publishedMap);
    return this.publishedMapListItemMapper.toDto(response);
  }

  async republish(id: string, instanceId: string): Promise<PublishedMapListItemDto> {
    let publishedMap = await this.publishedRepository.find(instanceId);
    if (!publishedMap) throw new Error("Map instance not found");
    if (publishedMap.mapInstanceId.toString() !== id) throw new Error("Map instance id does not match!");

    let republishedMap = publishedMap.toObject();
    republishedMap.publishedDate = new Date();
    republishedMap.publishedBy = "System";
    republishedMap._id = new mongoose.Types.ObjectId();

    let response = await this.publishedRepository.create(republishedMap);
    return this.publishedMapListItemMapper.toDto(response);
  }

  async getPublishedList(id: string): Promise<PublishedMapListItemDto[]> {
    let response = await this.publishedRepository.query({ mapInstanceId: id }, { publishedDate: "desc" });
    return response.map((item) => this.publishedMapListItemMapper.toDto(item));
  }

  async getLatestPublished(name: string): Promise<PublishedMapConfigDto | null> {
    let response = await this.publishedRepository.query({ name: name }, { publishedDate: "desc" }, 1);
    if (response.length === 0) {
      return null;
    }
    return this.publishedMapMapper.toDto(response[0]);
  }
  async getPublished(id: string): Promise<PublishedMapConfigDto> {
    let response = await this.publishedRepository.find(id.replace(/\.json$/ig, ""));
    return this.publishedMapMapper.toDto(response);
  }

  async create(mapInstance: MapInstanceDto): Promise<MapInstanceDto> {
    let dbInstance = this.instanceMapper.toDBModel(mapInstance, true);
    let response = await this.repository.create(dbInstance);
    return this.instanceMapper.toDto(response);
  }

  async syncLayer(mapInstanceIds: string[], type: string, layerId: string, actions: string[]): Promise<void> {
    if (actions.length === 0) throw new Error("No actions provided");
    const layerService = createLayerService(type);
    const layer = await layerService.find(layerId);
    if (!layer) throw new Error("Layer not found");

    const instances = await this.repository.query({ _id: { $in: mapInstanceIds } });
    if (!instances.length) throw new Error("Instances not found");

    for (let instance of instances) {
      let layers = instance.instance.layers as any[];
      if (!layers) continue;

      let updated = false;

      layers = layers.map((existing) => {
        if (existing.id === layer.id) {
          updated = true;
          const existingGroup = existing.group;
          const existingSource = existing.source;
          const existingStyle = existing.style;

          let updatedLayer = { ...existing };

          if (actions.includes("source")) {
            updatedLayer.source = layer.source;
          }

          if (actions.includes("style")) {
            updatedLayer.style = layer.style;
          }

          if (actions.includes("details")) {
            updatedLayer = { ...layer };
            updatedLayer.source = actions.includes("source") ? layer.source : existingSource;
            updatedLayer.style = actions.includes("style") ? layer.style : existingStyle;
          }

          updatedLayer.group = existingGroup;

          return updatedLayer;
        }
        return existing;
      });

      if (updated) {
        instance.instance.layers = layers;
        await this.repository.update(instance._id.toString(), instance);
      }
    }
  }

  async update(id: string, mapInstance: MapInstanceDto): Promise<MapInstanceDto> {
    if (id !== mapInstance.id) throw new Error("Id in body does not match id in url");
    let dbInstance = this.instanceMapper.toDBModel(mapInstance, false);
    let response = await this.repository.update(id, dbInstance);
    if (!response) throw new Error("Instance not found");
    return this.instanceMapper.toDto(response);
  }
  async delete(id: string): Promise<MapInstanceDto> {
    let response = await this.repository.delete(id);
    return this.instanceMapper.toDto(response);
  }
}

export { MapInstanceService };
