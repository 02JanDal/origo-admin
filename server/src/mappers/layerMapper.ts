import { IMapper } from "@/interfaces";
import { DBLinkResource, DBStyleSchema } from "@/models";
import {
  DBLayerBase,
  DBWFSLayer,
  DBWMSLayer,
  DBWMTSLayer,
  layerModel,
} from "@/models/layer.model";
import {
  BaseLayerDto,
  LinkResourceDto,
  StyleSchemaDto,
  WFSLayerDto,
  WMSLayerDto,
  WMTSLayerDto,
} from "@/shared/interfaces/dtos";
import mongoose from "mongoose";

import { linkResourceMapper } from "@/mappers/linkResourceMapper";
import StyleSchemaMapper from "./styleSchemaMapper";

class BaseLayerMapper implements IMapper<DBLayerBase, BaseLayerDto> {
  protected _linkResourceMapper: IMapper<DBLinkResource, LinkResourceDto>;
  protected _styleSchemaMapper: IMapper<DBStyleSchema, StyleSchemaDto>;

  constructor() {
    this._linkResourceMapper = new linkResourceMapper();
    this._styleSchemaMapper = new StyleSchemaMapper();
  }

  toDto(model: DBLayerBase): BaseLayerDto {
    return {
      id: model._id.toString(),
      layer_id: model.layer_id,
      name: model.name,
      source: this._linkResourceMapper.toDto(model.source as DBLinkResource),
      title: model.title,
      abstract: model.abstract ?? "",
      queryable: model.queryable,
      type: model.type,
      visible: model.visible,
      attribution: model.attribution ?? "",
      style: model.style
        ? this._styleSchemaMapper.toDto(model.style as DBStyleSchema)
        : undefined,
      extendedAttributes: model.extendedAttributes ?? undefined,
    };
  }

  toDBModel(dto: BaseLayerDto, create: boolean = false): DBLayerBase {
    const dbModel = new layerModel({
      name: dto.name,
      layer_id: dto.layer_id,
      source: this._linkResourceMapper.toDBModel(dto.source),
      title: dto.title,
      abstract: dto.abstract,
      queryable: dto.queryable,
      type: dto.type,
      visible: dto.visible,
      attribution: dto.attribution,
      style: dto.style ? new mongoose.Types.ObjectId(dto.style.id) : undefined,
      extendedAttributes: dto.extendedAttributes ?? null,
    } as Partial<DBLayerBase>);

    if (!create) {
      dbModel._id = new mongoose.Types.ObjectId(dto.id);
    }
    return dbModel;
  }
}

export class WFSLayerMapper
  extends BaseLayerMapper
  implements IMapper<DBWFSLayer, WFSLayerDto>
{
  constructor() {
    super();
  }

  toDto(model: DBWFSLayer): WFSLayerDto {
    const baseDto = super.toDto(model) as WFSLayerDto;
    return {
      ...baseDto,
      geometryName: model.geometryName,
      attributes: model.attributes ?? null,
      ...(model.opacity != null && { opacity: model.opacity }),
      clusterStyle: model.clusterStyle
        ? this._styleSchemaMapper.toDto(model.clusterStyle as DBStyleSchema)
        : undefined,
      clusterOptions: model.clusterOptions ?? null,
    };
  }

  toDBModel(dto: WFSLayerDto, create: boolean): DBWFSLayer {
    const model = super.toDBModel(dto, create) as DBWFSLayer;
    model.geometryName = dto.geometryName;
    model.attributes = dto.attributes ?? {};
    if (dto.opacity != null) model.opacity = dto.opacity;
    model.clusterStyle = dto.clusterStyle
      ? new mongoose.Types.ObjectId(dto.clusterStyle.id)
      : undefined;
    model.clusterOptions = dto.clusterOptions;
    return model;
  }
}

export class WMSLayerMapper
  extends BaseLayerMapper
  implements IMapper<DBWMSLayer, WMSLayerDto>
{
  constructor() {
    super();
  }

  toDto(model: DBWMSLayer): WMSLayerDto {
    try {
      const baseDto = super.toDto(model) as WMSLayerDto;
      return {
        ...baseDto,
        geometryName: model.geometryName,
        ...(model.featureinfoLayer != null && {
          opacity: model.featureinfoLayer,
        }),
        format: model.format,
        attributes: model.attributes ?? null,
        renderMode: model.renderMode,
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] WMSLayerMapper.toDto failed: ${error}`);
      return {} as WMSLayerDto;
    }
  }

  toDBModel(dto: WMSLayerDto, create: boolean): DBWMSLayer {
    const model = super.toDBModel(dto, create) as DBWMSLayer;
    model.geometryName = dto.geometryName;
    if (dto.featureinfoLayer != null)
      model.featureinfoLayer = dto.featureinfoLayer;
    model.attributes = dto.attributes ?? {};
    model.renderMode = dto.renderMode;
    model.format = dto.format;
    return model;
  }
}

export class WMTSLayerMapper
  extends BaseLayerMapper
  implements IMapper<DBWMTSLayer, WMTSLayerDto>
{
  constructor() {
    super();
  }
  toDto(model: DBWMTSLayer): WMTSLayerDto {
    const baseDto = super.toDto(model) as WMTSLayerDto;
    return {
      ...baseDto,
      format: model.format,
      maxScale: model.maxScale ? model.maxScale : undefined,
      ...(model.featureinfoLayer != null && {
        opacity: model.featureinfoLayer,
      }),
    };
  }

  toDBModel(dto: WMTSLayerDto, create: boolean): DBWMTSLayer {
    const model = super.toDBModel(dto, create) as DBWMTSLayer;
    model.format = dto.format;
    model.maxScale = dto.maxScale ? dto.maxScale : undefined;
    if (dto.featureinfoLayer != null)
      model.featureinfoLayer = dto.featureinfoLayer;
    return model;
  }
}

export class LayerMapper
  extends BaseLayerMapper
  implements IMapper<DBLayerBase, BaseLayerDto>
{
  constructor() {
    super();
  }
  toDto(model: DBLayerBase): BaseLayerDto {
    const baseDto = super.toDto(model) as WMTSLayerDto;
    return {
      ...baseDto,
    };
  }

  toDBModel(dto: WMTSLayerDto, create: boolean): DBWMTSLayer {
    throw new Error(
      "Method not implemented since it is not needed for this mapper"
    );
  }
}
