import { CacheManager } from "../cacheManager";
import { UserInfo } from "./auth/userInfoCache";

export class FilterJsonService {
  public async filterJson(json: any, proxyUrl: string, userInfo: UserInfo, cacheManager: CacheManager): Promise<any> {
    const permissions = typeof userInfo.groups === "string"
        ? userInfo.groups.replace(/^CN=/gi,"").split(",CN=").map((claim : string) => `CN=${claim}`)
        : Array.isArray(userInfo.groups)
            ? userInfo.groups
            : Object.keys(userInfo.groups);
    permissions.push(userInfo.username);

    if (json.layers) {
      json.layers = json.layers.filter((layer: any) => {
        return permissions.some((p: any) => cacheManager.hasPermission(p, layer.id));
      });
    }

    if (process.env.RESTRICT_MAPCONTROLS === "true") {
      console.log(`[${new Date().toISOString()}] RESTRICT_MAPCONTROLS is enabled`);
      if (json.controls) {
        json.controls = json.controls.filter((control: any) => {
          return permissions.some((p: any) => cacheManager.hasControlPermission(p, control.name));
        });
      }
    }

    const usedSources = new Set<string>(json.layers.map((layer: any) => layer.source));

    if (json.source) {
      const filteredSources: { [key: string]: any } = {};
      for (const key of usedSources) {
        if (typeof key === "string" && json.source[key]) {
          const source = json.source[key];
          if (source.url) {
            const url = cacheManager.getSourceUrlByName(key);
            if (url) {
              source.url = `${proxyUrl}gis/${key}`;
            }
          }
          filteredSources[key] = source;
        }
      }
      json.source = filteredSources;
    }

    const usedStyles = new Set<string>();
    json.layers.forEach((layer: any) => {
      if (layer.style) {
        usedStyles.add(layer.style);
      }
      if (layer.clusterStyle) {
        usedStyles.add(layer.clusterStyle);
      }
    });

    if (json.styles) {
      const filteredStyles: { [key: string]: any } = {};
      for (const styleName of usedStyles) {
        if (json.styles[styleName]) {
          filteredStyles[styleName] = json.styles[styleName];
        }
      }
      json.styles = filteredStyles;
    }

    const remainingGroups = new Set<string>(json.layers.map((layer: any) => layer.group));

    const filterGroups = (groups: any[]): any[] => {
      return groups.filter((group) => {
        if (group.groups) {
          group.groups = filterGroups(group.groups);
        }
        return remainingGroups.has(group.name) || (group.groups && group.groups.length > 0);
      });
    };

    if (json.groups) {
      json.groups = filterGroups(json.groups);
    }

    if (json.layers) {
      json.layers = json.layers.map((layer: any) => {
        const { id, layer_id, ...rest } = layer;
        if (layer_id !== null && layer_id !== undefined && layer_id !== "") {
          return { ...rest, id: layer_id };
        } else {
          return rest;
        }
      });
    }

    return json;
  }
}
