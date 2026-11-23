import { DBRole, RoleModel } from "@/models";
import { Repository } from "@/repositories/Repository";
import { IMapper } from "@/interfaces";
import { RoleDto } from "@/shared/interfaces/dtos";
import { roleMapper } from "@/mappers/permissionMapper";
import { updateProxyCache } from "@/utils/proxyUtils";

class PermissionService {
  private repository: Repository<DBRole>;
  private mapper: IMapper<DBRole, RoleDto>;
  constructor() {
    this.repository = new Repository<DBRole>(RoleModel);
    this.mapper = new roleMapper();
  }
  async find(id: string): Promise<RoleDto> {
    var response = await this.repository.find(id);
    return this.mapper.toDto(response);
  }
  async findByName(name: string): Promise<RoleDto | null> {
    const caseInsensitiveName = new RegExp(`^${name}$`, "i");
    var response = await this.repository.query({ role: caseInsensitiveName });
    if (response.length === 0) {
      return null;
    }
    return this.mapper.toDto(response[0]);
  }

  async findAll(): Promise<RoleDto[]> {
    var response = await this.repository.findAll();
    return response.map((item) => this.mapper.toDto(item));
  }

  async create(role: RoleDto): Promise<RoleDto> {
    var existingRole = await this.findByName(role.role);
    if (existingRole) {
      throw new Error("Role already exists");
    }

    var response = await this.repository.create(this.mapper.toDBModel(role));
    await this.refreshProxyCache();
    return this.mapper.toDto(response);
  }

  async update(id: string, role: RoleDto): Promise<RoleDto> {
    if (id !== role.id) throw new Error("Id in body does not match id in url");
    var existingRole = await this.findByName(role.role);

    if (existingRole && existingRole.id !== id) {
      throw new Error("Role with name already exists");
    }

    var response = await this.repository.update(
      id,
      this.mapper.toDBModel(role)
    );

    await this.refreshProxyCache();
    return this.mapper.toDto(response);
  }

  async duplicate(id: string): Promise<RoleDto> {
    let objectToDuplicate = await this.repository.find(id);
    let newObject = objectToDuplicate.toObject();
    delete newObject._id;

    newObject.role = newObject.role + " (copy)";
    let created = await this.repository.create(newObject);
    await this.refreshProxyCache();
    return this.mapper.toDto(created);
  }

  async delete(id: string): Promise<RoleDto> {
    var response = await this.repository.delete(id);
    await this.refreshProxyCache();
    return this.mapper.toDto(response);
  }

  private async refreshProxyCache(): Promise<void> {
    try {
      await updateProxyCache();
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to update proxy cache: ${error}`);
    }
  }
}

export { PermissionService };
