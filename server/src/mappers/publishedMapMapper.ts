import { IMapper } from "@/interfaces";
import { DBMapInstance } from "@/models";
import { DBPublishedMap } from "@/models/publishedMap.model";
import {
  CustomStyleDto,
  GroupDto,
  IconStyleDto,
  LayerDto,
  LinkResourceDto,
  PublishedMapConfigDto,
  PublishedMapListItemDto,
  StyleItemDto,
  StyleSchemaDto,
  StyleType,
} from "@/shared/interfaces/dtos";

/// This is a mapper for the published map list item, shown in the list of published maps.
export class publishedMapListItemMapper
  implements IMapper<DBPublishedMap, PublishedMapListItemDto>
{
  toDto(model: DBPublishedMap): PublishedMapListItemDto {
    return {
      id: model.id,
      comment: model.comment,
      title: model.title,
      name: model.name,
      publishedDate: convertDateToSwedishTime(model.publishedDate),
      url: `${process.env.MAPINSTANCE_ROUTE_PATH}/published/${model.id}`,
    };
  }
  toDBModel(dto: PublishedMapListItemDto, create: boolean): DBPublishedMap {
    throw new Error("Method not implemented, not needed for list item");
  }
}

// This mapper is used when creating a published map from a map instance, uses the previewMapMapper to get the map config.
export class InstanceToPublishedMapMapper
  implements IMapper<DBPublishedMap, DBMapInstance>
{
  private previewMapMapper: PreviewMapMapper;

  constructor() {
    this.previewMapMapper = new PreviewMapMapper();
  }
  toDto(model: DBPublishedMap): DBMapInstance {
    throw new Error("Method not implemented, not needed");
  }
  toDBModel(
    model: DBMapInstance,
    comment: string,
    ...contexts: any[]
  ): DBPublishedMap {
    const [sources = [], styles = []] = contexts;
    const publishedModel: Partial<DBPublishedMap> = {
      comment,
      mapInstanceId: model._id,
      title: model.title,
      name: model.name,
      abstract: model.abstract ? model.abstract : "",
      publishedDate: new Date(),
      map: this.previewMapMapper.toDto(model, sources, styles, true),
    };

    return publishedModel as DBPublishedMap;
  }
}
/// Mapper for the published map config, used when working with the published map itself, visible in the admin preview or when publishing to the end users.
export class PreviewMapMapper
  implements IMapper<DBMapInstance, PublishedMapConfigDto>
{
  toDBModel(dto: PublishedMapConfigDto, ...contexts: any[]): DBMapInstance {
    throw new Error("Method not implemented, not needed");
  }

  toDto(model: DBMapInstance, ...contexts: any[]): PublishedMapConfigDto {
    const [sources = [], styles = [], publish = false] = contexts;
    const settings = model.instance.settings?.setting || {};
    const groupsWithoutId = model.instance.groups
      ? removeIdFromGroups(model.instance.groups as GroupDto[])
      : [];

    return {
      controls: model.instance.controls?.map((control: any) => control.control),
      ...settings,
      groups: groupsWithoutId,
      source: createDistinctSources(
        model.instance.layers as LayerDto[],
        sources
      ),
      layers: transformLayers(
        model.instance.layers as LayerDto[],
        publish,
        sources,
        styles
      ),
      styles: createDistinctStyles(model.instance.layers as LayerDto[], styles),
    };
  }
}

/// Mapper for the published map config, used when working with the published map itself, visible to the end user.
export class publishedMapMapper
  implements IMapper<DBPublishedMap, PublishedMapConfigDto>
{
  toDBModel(dto: PublishedMapConfigDto, create?: boolean): DBPublishedMap {
    throw new Error("Method not implemented, not needed");
  }
  toDto(model: DBPublishedMap, ...contexts: any[]): PublishedMapConfigDto {
    const [publish = false] = contexts;
    model.map.layers = transformLayers(model.map.layers as LayerDto[], publish);
    return model.map as PublishedMapConfigDto;
  }
}

function removeIdFromGroups(groups: GroupDto[]): any[] {
  return groups.map((group) => {
    const { id, groups: subGroups, ...rest } = group;
    const cleanedSubGroups = subGroups ? removeIdFromGroups(subGroups) : [];

    return {
      ...rest,
      ...(cleanedSubGroups.length > 0 ? { groups: cleanedSubGroups } : {}),
    };
  });
}

function createDistinctSources(layers: any[], sources: LinkResourceDto[]): any {
  const sourceMap = new Map<string, any>();

  layers.forEach((layer) => {
    if (!layer.source) return;

    // For string sources (dynamic layers where source is a URL)
    if (typeof layer.source === "string" && layer.source.match(/^http(s)?/i)) {
      const syntheticName = `${layer.name}-src`;
      if (!sourceMap.has(syntheticName)) {
        sourceMap.set(syntheticName, { url: layer.source });
      }
      return;
    }

    // For string sources (dynamic layers where source is a configured source, looked up below)
    if (typeof layer.source === "string") {
      if (!sourceMap.has(layer.source)) {
        sourceMap.set(layer.source, {});
      }
      return;
    }

    // For object sources - try to get name directly or look up by ID
    let sourceName = layer.source.name;
    let sourceUrl = layer.source.url;

    // If no name but has id, look up from sources array
    if (!sourceName && layer.source.id) {
      const matchingSource = sources.find((s) => s.id === layer.source.id);
      if (matchingSource) {
        sourceName = matchingSource.name;
        sourceUrl = matchingSource.url;
      }
    }

    if (sourceName && !sourceMap.has(sourceName)) {
      sourceMap.set(sourceName, { url: sourceUrl });
    }
  });

  sourceMap.forEach((value, key) => {
    const matchingSource = sources.find((s) => s.name === key);
    if (matchingSource) {
      if (matchingSource.url) {
        value.url = matchingSource.url;
      }

      if (
        matchingSource.extendedAttributes &&
        matchingSource.extendedAttributes.length > 0
      ) {
        matchingSource.extendedAttributes.forEach((attr) => {
          if (attr.key && attr.value !== undefined) {
            try {
              const parsedValue = JSON.parse(attr.value);
              value[attr.key] = parsedValue;
            } catch (e) {
              value[attr.key] = attr.value;
            }
          }
        });
      }
    }
  });

  return Object.fromEntries(sourceMap);
}
function createDistinctStyles(
  layers: any[],
  styleSchemas: StyleSchemaDto[] = []
): any {
  const styles = layers.reduce((acc, layer) => {
    ["style", "clusterStyle"].forEach((styleKey) => {
      const styleContainer = layer[styleKey];
      if (!styleContainer) return;

      // Plain string name reference (e.g. api-select fields configured
      // with valueField: "name") - look up the style schema by name.
      let styleName: string | undefined;
      let layerStyles: StyleItemDto[][] | undefined;

      if (typeof styleContainer === "string") {
        styleName = styleContainer;
        const matchingStyle = styleSchemas.find((s) => s.name === styleName);
        if (matchingStyle) {
          layerStyles = matchingStyle.styles;
        }
      } else {
        // Try to get name directly or look up by ID
        styleName = styleContainer.name;
        layerStyles = styleContainer.styles;

        // If no name but has id, look up from styleSchemas array
        if (!styleName && styleContainer.id) {
          const matchingStyle = styleSchemas.find(
            (s) => s.id === styleContainer.id
          );
          if (matchingStyle) {
            styleName = matchingStyle.name;
            layerStyles = matchingStyle.styles;
          }
        }
      }

      if (!styleName || !layerStyles) return;

      if (!acc[styleName]) {
        acc[styleName] = [];
      }

      layerStyles.forEach((styleArray: StyleItemDto[]) => {
        const transformedStyle = styleArray.map((styleItem) => {
          if (styleItem.type === StyleType.Custom) {
            const { id, type, style, ...rest } = styleItem as CustomStyleDto;
            return { ...style, ...rest };
          } else {
            const { background } = styleItem as IconStyleDto;
            if (background === true) {
              const { icon } = styleItem as IconStyleDto;
              return { image: { ...icon } };
            } else {
              const { id, type, ...styleWithoutIdAndType } =
                styleItem as IconStyleDto;
              return { ...styleWithoutIdAndType };
            }
          }
        });

        const stringifiedStyle = JSON.stringify(transformedStyle);
        if (
          !acc[styleName].some(
            (existingStyleArray: any) =>
              JSON.stringify(existingStyleArray) === stringifiedStyle
          )
        ) {
          acc[styleName].push(transformedStyle);
        }
      });
    });

    return acc;
  }, {});

  return styles;
}

function transformLayers(
  layerDtos: any[],
  publish: boolean = false,
  sources: LinkResourceDto[] = [],
  styleSchemas: StyleSchemaDto[] = []
): any[] {
  // Used to be derived from `PROXY_UPDATE_URL` being set (i.e. "is a proxy
  // deployed in front of this API"). Now that the GIS proxy/gateway is always
  // part of this same process, this is an explicit opt-in flag instead:
  // when enabled, published layer ids are left for the GIS proxy's
  // jsonFilterService to resolve (id/layer_id swap happens there); when
  // disabled, this mapper resolves it directly for direct API consumers.
  const proxyUrlSet = process.env.GIS_PROXY_ENABLED?.toLowerCase?.() === "true";
  const authEnabled = process.env.AUTH_ENABLED?.toLowerCase?.() === "true";
  let layers = layerDtos.map((layer) => {
    const {
      style,
      source,
      clusterStyle,
      extendedAttributes,
      layer_id,
      ...restOfLayer
    } = layer;
    const transformedLayer: any = {
      ...restOfLayer,
    };

    if (source) {
      if (typeof source === "string" && source.match(/^http(s)?/i)) {
        // String sources are URLs - use synthetic name to match createDistinctSources
        transformedLayer.source = `${layer.name}-src`;
      } else {
        // Object sources - try to get name directly or look up by ID
        let sourceName = source.name;
        if (!sourceName && source.id) {
          const matchingSource = sources.find((s) => s.id === source.id);
          if (matchingSource) {
            sourceName = matchingSource.name;
          }
        }
        transformedLayer.source = sourceName || source;
      }
    } else if (layer.source) {
      transformedLayer.source = layer.source;
    }

    if (style) {
      if (typeof style === "object") {
        // Object styles - try to get name directly or look up by ID
        let styleName = style.name;
        if (!styleName && style.id) {
          const matchingStyle = styleSchemas.find((s) => s.id === style.id);
          if (matchingStyle) {
            styleName = matchingStyle.name;
          }
        }
        transformedLayer.style = styleName || style;
      } else {
        transformedLayer.style = style;
      }
    } else if (layer.style) {
      transformedLayer.style = layer.style;
    }

    if (clusterStyle) {
      // Object clusterStyles - try to get name directly or look up by ID
      let clusterStyleName = clusterStyle.name;
      if (!clusterStyleName && clusterStyle.id) {
        const matchingStyle = styleSchemas.find(
          (s) => s.id === clusterStyle.id
        );
        if (matchingStyle) {
          clusterStyleName = matchingStyle.name;
        }
      }
      if (clusterStyleName) {
        transformedLayer.clusterStyle = clusterStyleName;
      }
    }
    if (publish || (proxyUrlSet && authEnabled)) {
      transformedLayer.layer_id = layer_id;
    } else {
      if (layer_id !== null && layer_id !== undefined && layer_id !== "") {
        transformedLayer.id = layer_id;
      } else {
        delete transformedLayer.id;
      }
    }

    let extendedProps: any = {};

    if (Array.isArray(extendedAttributes)) {
      extendedAttributes.forEach((attr) => {
        if (attr.key && attr.value !== undefined) {
          try {
            const parsedValue = JSON.parse(attr.value);
            extendedProps[attr.key] = parsedValue;
          } catch (e) {
            extendedProps[attr.key] = attr.value;
          }
        }
      });
    }

    const orderedLayer = {
      ...transformedLayer,
      ...extendedProps,
    };

    return orderedLayer;
  });
  const backgrounds = layers.filter((layer) => layer.group === "background");
  const nonBackgrounds = layers.filter((layer) => layer.group !== "background");
  return nonBackgrounds.concat(backgrounds);
}
function convertDateToSwedishTime(utcDate: Date): string {
  const date = new Date(utcDate);

  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const formattedDate = formatter.format(date);
  return formattedDate.replace(/\//g, "-").replace(",", "");
}
