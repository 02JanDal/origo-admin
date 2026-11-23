import { Request, Response } from "express";
import { permissionCacheService } from "@/services/permissionCache.service";
import { isRefreshOnSaveEnabled } from "@/utils/proxyUtils";
import { ProxyCacheStatusDto } from "@/shared/interfaces/dtos";

class ProxyCacheController {
  async getStatus(req: Request, res: Response) {
    res.status(200).json(this.status());
  }

  async refresh(req: Request, res: Response) {
    const before = permissionCacheService.getLastUpdated();
    await permissionCacheService.refreshCache();
    // refreshCache logs errors instead of throwing, so check that the cache was rebuilt
    if (permissionCacheService.getLastUpdated() === before) {
      res.status(500).json({ error: "Failed to refresh proxy cache" });
      return;
    }
    res.status(200).json(this.status());
  }

  private status(): ProxyCacheStatusDto {
    return {
      initialized: permissionCacheService.isCacheInitialized(),
      lastUpdated: permissionCacheService.getLastUpdated()?.toISOString(),
      refreshOnSave: isRefreshOnSaveEnabled(),
    };
  }
}

const proxyCacheController = new ProxyCacheController();
export { proxyCacheController };
