import { ProxyCacheStatusDto } from "@/shared/interfaces/dtos";
import { BaseApiService } from "./baseService";

class ProxyCacheApiService extends BaseApiService<ProxyCacheStatusDto> {
  async getStatus(): Promise<ProxyCacheStatusDto> {
    return this.executeWithEvents(async () => (await this.getRestClient()).get<ProxyCacheStatusDto>(this.resourcePath));
  }

  async refresh(): Promise<ProxyCacheStatusDto> {
    // The client's API proxy rejects POST requests without a body
    return this.executeWithEvents(async () => (await this.getRestClient()).post<ProxyCacheStatusDto>(`${this.resourcePath}/refresh`, {}));
  }
}

const ProxyCacheService = new ProxyCacheApiService("proxy-cache");
export { ProxyCacheService };
