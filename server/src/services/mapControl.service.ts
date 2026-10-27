import { DBMapControl, MapControlModel } from "@/models";
import MapControlMapper from "@/mappers/mapControlMapper";
import { Repository } from "@/repositories/Repository";
import { MapControlDto } from "@/shared/interfaces/dtos";
import { IMapper } from "@/interfaces";
import { updateProxyCache } from "@/utils/proxyUtils";
class MapControlService {
  private repository: Repository<DBMapControl>;
  private _mapper: IMapper<DBMapControl, MapControlDto>;

  constructor() {
    this.repository = new Repository<DBMapControl>(MapControlModel);
    this._mapper = new MapControlMapper();
  }
  async find(id: string): Promise<MapControlDto> {
    var response = await this.repository.find(id);
    return this._mapper.toDto(response);
  }
  async findAll(): Promise<MapControlDto[]> {
    var response = await this.repository.findAll();
    return response.map((item) => this._mapper.toDto(item));
  }
  async create(mapControl: MapControlDto): Promise<MapControlDto> {
    var response = await this.repository.create(this._mapper.toDBModel(mapControl));
    await this.refreshProxyCache();
    return this._mapper.toDto(response);
  }

  async update(id: string, mapControl: MapControlDto): Promise<MapControlDto> {
    if (id !== mapControl.id) throw new Error("Id in body does not match id in url");
    var response = await this.repository.update(id, this._mapper.toDBModel(mapControl));
    await this.refreshProxyCache();
    return this._mapper.toDto(response);
  }
  async delete(id: string): Promise<MapControlDto> {
    var response = await this.repository.delete(id);
    await this.refreshProxyCache();
    return this._mapper.toDto(response);
  }

  private async refreshProxyCache(): Promise<void> {
    try {
      await updateProxyCache();
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to update proxy cache: ${error}`);
    }
  }
}

export { MapControlService };
