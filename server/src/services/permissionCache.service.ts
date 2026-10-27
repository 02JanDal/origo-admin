import { ProxyService } from "./proxy.service";
import { ProxyResourceDto, ProxyRoleDto } from "@/shared/interfaces/proxy";

interface Permission {
  id: string;
  type: string;
}

class OptimizedPermissionCache {
  private layerPermissions: Map<string, Set<string>> = new Map();

  constructor(resources: ProxyResourceDto[], roles: ProxyRoleDto[]) {
    this.buildCache(resources, roles);
  }

  private buildCache(resources: ProxyResourceDto[], roles: ProxyRoleDto[]) {
    const permissionToActors = new Map<string, Set<string>>();
    roles.forEach((role) => {
      role.permissions.forEach((perm: any) => {
        if (!permissionToActors.has(perm.id)) {
          permissionToActors.set(perm.id, new Set());
        }
        role.actors.forEach((actor: any) => {
          permissionToActors.get(perm.id)!.add(actor.name);
        });
      });
    });

    resources.forEach((resource) => {
      const key = `${resource.source}:${resource.name}`;
      const resourcePermissionActors = permissionToActors.get(resource.id);

      if (resourcePermissionActors) {
        if (!this.layerPermissions.has(key)) {
          this.layerPermissions.set(key, new Set());
        }
        resourcePermissionActors.forEach((actorName) => {
          this.layerPermissions.get(key)!.add(actorName);
        });
      }
    });
  }

  hasLayerPermission(source: string, layerName: string, actors: string[]): boolean {
    const key = `${source}:${layerName}`;
    const allowedActors = this.layerPermissions.get(key);
    if (!allowedActors) return false;

    return actors.some((actor) => allowedActors.has(actor));
  }
}

class ResourcesCache {
  private resources: ProxyResourceDto[];
  private resourcesById: Map<string, ProxyResourceDto> = new Map();
  private resourcesByName: Map<string, ProxyResourceDto[]> = new Map();
  private resourcesBySourceId: Map<string, ProxyResourceDto[]> = new Map();
  private sourceUrlByName: Map<string, string> = new Map();
  private sourceNameByUrl: Map<string, string> = new Map();

  constructor(resources: ProxyResourceDto[]) {
    this.resources = resources;
    this.buildCache(resources);
    console.info(`[${new Date().toISOString()}] Resources cache initialized`);
  }

  private buildCache(resources: ProxyResourceDto[]) {
    console.info(`[${new Date().toISOString()}] Building resources cache`);
    resources.forEach((resource) => {
      this.resourcesById.set(resource.id, resource);

      if (!this.resourcesByName.has(resource.name)) {
        this.resourcesByName.set(resource.name, []);
      }
      this.resourcesByName.get(resource.name)!.push(resource);

      if (resource.sourceId) {
        if (!this.resourcesBySourceId.has(resource.sourceId)) {
          this.resourcesBySourceId.set(resource.sourceId, []);
        }
        this.resourcesBySourceId.get(resource.sourceId)!.push(resource);
      }
      if (resource?.type === "source") {
        this.sourceUrlByName.set(resource.name, resource.sourceUrl!);
        this.sourceNameByUrl.set(resource.sourceUrl!, resource.name);
      }
    });
  }

  getResourceById(id: string): ProxyResourceDto | undefined {
    return this.resourcesById.get(id);
  }

  getResourcesByName(name: string): ProxyResourceDto[] {
    return this.resourcesByName.get(name) || [];
  }

  getResourcesBySourceId(sourceId: string): ProxyResourceDto[] {
    return this.resourcesBySourceId.get(sourceId) || [];
  }

  getSourceUrlByName(id: string): string | undefined {
    return this.sourceUrlByName.get(id);
  }

  getSourceByUrl(url: string): string | undefined {
    return this.sourceNameByUrl.get(url);
  }

  getAllResources(): ProxyResourceDto[] {
    return Array.from(this.resourcesById.values());
  }

  getResources(): ProxyResourceDto[] {
    return this.resources;
  }
}

class PermissionCache {
  private roles: ProxyRoleDto[];
  private actorPermissions: Map<string, Set<string>> = new Map();
  private permissionDetails: Map<string, Permission> = new Map();

  constructor(rolesData: ProxyRoleDto[]) {
    this.roles = rolesData;
    this.buildCache(rolesData);
  }

  private buildCache(rolesData: ProxyRoleDto[]) {
    rolesData.forEach((role) => {
      role.actors.forEach((actor: { name: string; type: string }) => {
        const actorKey = `${actor.name.toLowerCase()}`;
        if (!this.actorPermissions.has(actorKey)) {
          this.actorPermissions.set(actorKey, new Set());
        }

        role.permissions.forEach((permission: any) => {
          this.actorPermissions.get(actorKey)!.add(permission.id);
          this.permissionDetails.set(permission.id, permission);
        });
      });
    });
  }

  hasPermission(actorName: string, permissionId: string): boolean {
    const actorKey = `${actorName.toLowerCase()}`;
    return this.actorPermissions.get(actorKey)?.has(permissionId) || false;
  }

  getPermissionDetails(permissionId: string): Permission | undefined {
    return this.permissionDetails.get(permissionId);
  }

  getRoles(): ProxyRoleDto[] {
    return this.roles;
  }
}

/**
 * In-process replacement for the standalone proxy's CacheManager.
 * Instead of fetching roles/resources over HTTP, it calls ProxyService directly.
 */
class PermissionCacheService {
  private lastUpdated: Date | null = null;
  private permissionCache: PermissionCache | null = null;
  private resourcesCache: ResourcesCache | null = null;
  private optimizedPermissionCache: OptimizedPermissionCache | null = null;
  private proxyService: ProxyService;
  private initializing: Promise<void> | null = null;

  constructor() {
    this.proxyService = new ProxyService();
  }

  async initializeCache(): Promise<void> {
    await this.refreshCache();
  }

  async refreshCache(): Promise<void> {
    // Avoid concurrent refreshes stampeding the database.
    if (this.initializing) {
      return this.initializing;
    }

    this.initializing = this.doRefreshCache();
    try {
      await this.initializing;
    } finally {
      this.initializing = null;
    }
  }

  private async doRefreshCache(): Promise<void> {
    try {
      console.info(`[${new Date().toISOString()}] Refreshing permission cache`);

      const [roles, resources] = await Promise.all([
        this.proxyService.getAllRoles(),
        this.proxyService.getAllResources(),
      ]);

      this.permissionCache = new PermissionCache(roles);
      this.resourcesCache = new ResourcesCache(resources);
      this.optimizedPermissionCache = new OptimizedPermissionCache(resources, roles);
      this.lastUpdated = new Date();

      console.info(`[${new Date().toISOString()}] Permission cache refresh completed`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error refreshing permission cache:`, error);
    }
  }

  getResourceById(id: string): ProxyResourceDto | undefined {
    if (!this.resourcesCache) {
      throw new Error("Resources cache is not initialized");
    }
    return this.resourcesCache.getResourceById(id);
  }

  getResourcesByName(name: string): ProxyResourceDto[] {
    if (!this.resourcesCache) {
      throw new Error("Resources cache is not initialized");
    }
    return this.resourcesCache.getResourcesByName(name);
  }

  getSourceUrlByName(name: string): string | undefined {
    if (!this.resourcesCache) {
      throw new Error("Resources cache is not initialized");
    }
    return this.resourcesCache.getSourceUrlByName(name);
  }

  getSourceByUrl(url: string): string | undefined {
    if (!this.resourcesCache) {
      throw new Error("Resources cache is not initialized");
    }
    return this.resourcesCache.getSourceByUrl(url);
  }

  hasPermission(actorName: string, permissionId: string): boolean {
    if (!this.permissionCache) {
      throw new Error("Permission cache is not initialized");
    }
    return this.permissionCache.hasPermission(actorName, permissionId);
  }

  hasLayerPermission(source: string, layerName: string, actors: string[]): boolean {
    if (!this.optimizedPermissionCache) {
      throw new Error("Optimized permission cache is not initialized");
    }
    return this.optimizedPermissionCache.hasLayerPermission(source, layerName, actors);
  }

  hasSourcePermission(source: string, actors: string[]): boolean {
    if (!this.permissionCache) {
      throw new Error("Permission cache is not initialized");
    }

    const permissionId = this.resourcesCache
      ?.getResources()
      .filter((r) => r.type === "source" && r.name === source)
      .map((r) => r.id);

    if (permissionId && permissionId.length === 1) {
      for (const actor of actors) {
        if (this.permissionCache.hasPermission(actor, permissionId[0])) {
          return true;
        }
      }
    }

    return false;
  }

  hasControlPermission(actors: string, control: string): boolean {
    if (!this.permissionCache) {
      throw new Error("Permission cache is not initialized");
    }

    const permissionId = this.resourcesCache
      ?.getResources()
      .filter((r) => r.type === "control" && r.name === control)
      .map((r) => r.id);
    if (permissionId && permissionId.length === 1) {
      return this.permissionCache.hasPermission(actors, permissionId[0]);
    }
    return false;
  }

  getPermissionDetails(permissionId: string): Permission | undefined {
    if (!this.permissionCache) {
      throw new Error("Permission cache is not initialized");
    }
    return this.permissionCache.getPermissionDetails(permissionId);
  }

  isCacheInitialized(): boolean {
    return this.permissionCache !== null && this.resourcesCache !== null;
  }

  async healthCheck(): Promise<{
    status: string;
    message: string;
    lastUpdated?: string;
  }> {
    if (!this.isCacheInitialized()) {
      try {
        await this.initializeCache();
        return {
          status: "recovered",
          message: "Cache was empty and has been initialized.",
        };
      } catch (error) {
        return {
          status: "error",
          message: "Failed to initialize cache.",
          lastUpdated: this.lastUpdated ? this.formatDateToStockholmTime(this.lastUpdated) : undefined,
        };
      }
    }
    return {
      status: "healthy",
      message: "Cache is initialized and ready.",
      lastUpdated: this.lastUpdated ? this.formatDateToStockholmTime(this.lastUpdated) : undefined,
    };
  }

  private formatDateToStockholmTime(date: Date): string {
    const stockholmFormatter = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Stockholm",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = stockholmFormatter.formatToParts(date);
    const dateTimeMap: { [key: string]: string } = {};
    parts.forEach(({ type, value }) => {
      dateTimeMap[type] = value;
    });

    return `${dateTimeMap.year}-${dateTimeMap.month}-${dateTimeMap.day} ${dateTimeMap.hour}:${dateTimeMap.minute}:${dateTimeMap.second}`;
  }
}

const permissionCacheService = new PermissionCacheService();

export { PermissionCacheService, permissionCacheService };
