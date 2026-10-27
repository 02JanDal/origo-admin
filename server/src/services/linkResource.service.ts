import { DBLinkResource, LinkResourceModel } from "@/models";
import { linkResourceMapper } from "@/mappers/linkResourceMapper";
import { Repository } from "@/repositories/Repository";
import { LinkResourceDto } from "@/shared/interfaces/dtos";
import { IMapper } from "@/interfaces";
import { updateProxyCache } from "@/utils/proxyUtils";

class LinkResourceService {
  private repository: Repository<DBLinkResource>;
  private _linkResourceMapper: IMapper<DBLinkResource, LinkResourceDto>;
  constructor() {
    this.repository = new Repository<DBLinkResource>(LinkResourceModel);
    this._linkResourceMapper = new linkResourceMapper();
  }
  async find(id: string): Promise<LinkResourceDto> {
    var response = await this.repository.find(id);
    return this._linkResourceMapper.toDto(response);
  }
  async findAll(): Promise<LinkResourceDto[]> {
    var response = await this.repository.findAll();
    return response.map((item) => this._linkResourceMapper.toDto(item));
  }

  async getByName(name: string): Promise<LinkResourceDto[]> {
    var response = await this.repository.query({ name: name });
    return response.map((item) => this._linkResourceMapper.toDto(item));
  }

  async findByType(type: string): Promise<LinkResourceDto[]> {
    var response = await this.repository.query({ type: type });
    return response.map((item) => this._linkResourceMapper.toDto(item));
  }

  async create(linkResourceData: LinkResourceDto): Promise<LinkResourceDto> {
    var response = await this.repository.create(this._linkResourceMapper.toDBModel(linkResourceData));
    await this.refreshProxyCache();
    return this._linkResourceMapper.toDto(response);
  }

  async update(id: string, linkResourceData: LinkResourceDto): Promise<LinkResourceDto> {
    if (id !== linkResourceData.id) throw new Error("Id in body does not match id in url");
    var response = await this.repository.update(id, this._linkResourceMapper.toDBModel(linkResourceData));
    await this.refreshProxyCache();
    return this._linkResourceMapper.toDto(response);
  }
  async delete(id: string): Promise<LinkResourceDto> {
    var response = await this.repository.delete(id);
    await this.refreshProxyCache();
    return this._linkResourceMapper.toDto(response);
  }

  private async refreshProxyCache(): Promise<void> {
    try {
      await updateProxyCache();
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to update proxy cache: ${error}`);
    }
  }
}

export { LinkResourceService };
